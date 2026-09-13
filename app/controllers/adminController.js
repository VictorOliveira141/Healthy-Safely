const { adminModel } = require("../models/Admin");

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
      });
    } catch (erro) {
      console.error("[Admin.suporte]", erro);
      res.status(500).send("Não foi possível carregar o suporte.");
    }
  },

  responderSuporte: async (req, res) => {
    try {
      const sucesso = await adminModel.responderSuporte(
        req.params.id,
        req.body.resposta,
      );

      if (!sucesso) {
        return res.status(400).send("A resposta não pode estar vazia.");
      }

      return res.redirect("/admin/suporte");
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
