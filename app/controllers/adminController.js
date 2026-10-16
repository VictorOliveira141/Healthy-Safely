const { adminModel } = require("../models/Admin");
const { enviarEmailRespostaSuporte } = require("../config/email");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const adminController = {
  exibirLogin: (req, res) => {
    if (req.session.adminAutenticado) {
      return res.redirect("/admin/painel");
    }

    res.render("pages/admin/login", { erro: null });
  },

  processarLogin: (req, res) => {
    if (!ADMIN_PASSWORD) {
      console.error("[Admin] ADMIN_PASSWORD não configurada.");
      return res.status(500).render("pages/admin/login", {
        erro: "O acesso administrativo não está configurado.",
      });
    }

    if (String(req.body.senha || "") !== ADMIN_PASSWORD) {
      return res.status(401).render("pages/admin/login", {
        erro: "Senha incorreta. Tente novamente.",
      });
    }

    req.session.adminAutenticado = true;

    req.session.save((erro) => {
      if (erro) {
        console.error("[Admin.login] Erro ao salvar sessão:", erro);
        return res.status(500).render("pages/admin/login", {
          erro: "Não foi possível iniciar a sessão administrativa.",
        });
      }

      return res.redirect("/admin/painel");
    });
  },

  exibirPainel: async (req, res) => {
    try {
      const [stats, usuariosRecentes, suporteStats] = await Promise.all([
        adminModel.estatisticasGerais(),
        adminModel.listarUsuariosRecentes(8),
        adminModel.estatisticasSuporte(),
      ]);

      res.render("pages/admin/painel", {
        stats,
        usuariosRecentes,
        suporteStats,
      });
    } catch (erro) {
      console.error("[Admin.painel]", erro);
      res.status(500).render("errors/404");
    }
  },

  exibirUsuarios: async (req, res) => {
    try {
      const resultado = await adminModel.listarUsuarios({
        busca: req.query.busca,
        pagina: req.query.pagina,
        porPagina: req.query.porPagina,
      });

      res.render("pages/admin/usuarios", resultado);
    } catch (erro) {
      console.error("[Admin.usuarios]", erro);
      res.status(500).send("Não foi possível carregar os usuários.");
    }
  },

  exibirUsuario: async (req, res) => {
    try {
      const usuario = await adminModel.buscarUsuarioPorId(req.params.id);

      if (!usuario) {
        return res.status(404).render("errors/404");
      }

      const tarefas = await adminModel.listarAtividadeUsuario(req.params.id);

      res.render("pages/admin/usuario", {
        usuario,
        tarefas,
      });
    } catch (erro) {
      console.error("[Admin.usuario]", erro);
      res.status(500).send("Não foi possível carregar o usuário.");
    }
  },

  deletarUsuario: async (req, res) => {
    try {
      const sucesso = await adminModel.deletarUsuario(req.params.id);

      if (!sucesso) {
        return res.status(404).send("Usuário não encontrado.");
      }

      return res.redirect("/admin/usuarios");
    } catch (erro) {
      console.error("[Admin.deletarUsuario]", erro);
      return res.status(500).send("Não foi possível excluir o usuário.");
    }
  },

  exibirSuporte: async (req, res) => {
    try {
      const status = String(req.query.status || "");
      const [suporte, stats] = await Promise.all([
        adminModel.listarSuporte({ status }),
        adminModel.estatisticasSuporte(),
      ]);

      res.render("pages/admin/suporte", {
        suporte,
        stats,
        filtroStatus: status,
        mensagemSuporte:
          ({
            "email-enviado": "Resposta salva e e-mail enviado ao usuário.",
            "email-simulado":
              "Resposta salva. O e-mail não foi enviado porque o Brevo está em modo simulado.",
            "email-erro":
              "Resposta salva, mas não foi possível enviar o e-mail ao usuário.",
          })[req.query.aviso] || null,
      });
    } catch (erro) {
      console.error("[Admin.suporte]", erro);
      res.status(500).send("Não foi possível carregar o suporte.");
    }
  },

  responderSuporte: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const resposta = String(req.body.resposta || "").trim();

      if (!Number.isSafeInteger(id) || id < 1 || !resposta) {
        return res.status(400).send("A resposta não pode estar vazia.");
      }

      const solicitacao = await adminModel.buscarSolicitacaoSuporte(id);
      if (!solicitacao) {
        return res.status(404).send("Solicitação não encontrada.");
      }

      const salva = await adminModel.responderSuporte(id, resposta);
      if (!salva) {
        return res.status(404).send("Não foi possível salvar a resposta.");
      }

      const envio = await enviarEmailRespostaSuporte({
        ...solicitacao,
        resposta,
      });
      const aviso = envio.ok
        ? "email-enviado"
        : envio.simulated
          ? "email-simulado"
          : "email-erro";

      return res.redirect(`/admin/suporte?aviso=${aviso}`);
    } catch (erro) {
      console.error("[Admin.responderSuporte]", erro);
      return res.status(500).send("Não foi possível responder à solicitação.");
    }
  },

  alterarStatusSuporte: async (req, res) => {
    try {
      const sucesso = await adminModel.alterarStatusSuporte(
        req.params.id,
        req.body.status,
      );

      if (!sucesso) {
        return res.status(400).send("Status inválido.");
      }

      return res.redirect("/admin/suporte");
    } catch (erro) {
      console.error("[Admin.alterarStatusSuporte]", erro);
      return res.status(500).send("Não foi possível alterar o status.");
    }
  },

  sair: (req, res) => {
    req.session.adminAutenticado = false;

    req.session.save(() => {
      res.redirect("/admin");
    });
  },
};

module.exports = adminController;
