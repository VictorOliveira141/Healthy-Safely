const { usuarioModel } = require("../models/Usuario");
const { adminModel } = require("../models/Admin");
const { body, validationResult } = require("express-validator");
const {
  enviarEmailResetSenha,
  enviarEmailConfirmacaoEmail,
} = require("../config/email");

const usuarioController = {
  regrasValidacaoCliente: [
    body("nome")
      .trim()
      .notEmpty()
      .withMessage("*Obrigatório!")
      .bail()
      .isLength({ min: 3, max: 50 })
      .withMessage("*3 a 50 caracteres!")
      .matches(/^[A-Za-zÀ-ú\s]+$/)
      .withMessage("*Somente letras!"),
    body("nomeusuario")
      .trim()
      .notEmpty()
      .withMessage("*Obrigatório!")
      .bail()
      .isLength({ min: 3, max: 30 })
      .withMessage("*3 a 30 caracteres!")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("*Letras, números, hífen e underscore!"),
    body("email")
      .notEmpty()
      .withMessage("*Obrigatório!")
      .bail()
      .isEmail()
      .withMessage("*E-mail inválido!"),
    body("senha")
      .notEmpty()
      .withMessage("*Obrigatório!")
      .bail()
      .isStrongPassword({
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
      .withMessage("*Use maiúscula, número e símbolo!"),
    body("confirmarSenha")
      .notEmpty()
      .withMessage("*Obrigatório!")
      .custom((v, { req }) => {
        if (v !== req.body.senha) throw new Error("*Senhas não conferem!");
        return true;
      }),
  ],

  verificarDisponibilidade: async (req, res) => {
    try {
      const { email, nomeusuario } = req.query;
      const resposta = {};

      if (email) {
        const valor = String(email).trim();
        if (valor) {
          resposta.email = {
            valor,
            disponivel: !(await usuarioModel.emailExiste(valor)),
          };
        }
      }

      if (nomeusuario) {
        const valor = String(nomeusuario).trim();

        if (valor) {
          const usuarioId = req.session?.usuario?.id || null;

          resposta.nomeusuario = {
            valor,
            disponivel: await usuarioModel.nomeUsuarioDisponivel(
              valor,
              usuarioId,
            ),
          };
        }
      }

      res.json(resposta);
    } catch (err) {
      console.error("Erro ao verificar disponibilidade:", err);
      res.status(500).json({ erro: "Erro interno." });
    }
  },

  atualizarPerfil: async (req, res) => {
    const usuarioId = req.session.usuario.id;
    const nome = String(req.body.nome || "").trim();
    const nomeusuario = String(req.body.nomeusuario || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const emailAtual = String(req.session.usuario.email || "")
      .trim()
      .toLowerCase();

    if (
      nome.length < 3 ||
      nome.length > 50 ||
      !/^[A-Za-zÀ-ú\s]+$/.test(nome) ||
      nomeusuario.length < 3 ||
      nomeusuario.length > 30 ||
      !/^[a-zA-Z0-9_-]+$/.test(nomeusuario) ||
      (email && !/^\S+@\S+\.\S+$/.test(email))
    ) {
      return res.redirect("/configuracoes?perfil=invalid");
    }

    try {
      if (!(await usuarioModel.nomeUsuarioDisponivel(nomeusuario, usuarioId))) {
        return res.redirect("/configuracoes?perfil=indisponivel");
      }

      const fotoPerfil = req.file
        ? `/uploads/perfis/${req.file.filename}`
        : undefined;
      await usuarioModel.atualizarPerfil(usuarioId, {
        nome,
        nomeusuario,
        foto_perfil: fotoPerfil,
      });

      req.session.usuario.nome = nome;
      req.session.usuario.nomeusuario = nomeusuario;
      if (fotoPerfil) req.session.usuario.foto_perfil = fotoPerfil;
      req.session.nome = nome;

      if (!email || email === emailAtual) {
        return res.redirect("/configuracoes?perfil=salvo");
      }

      if (await usuarioModel.emailExiste(email)) {
        return res.redirect("/configuracoes?perfil=email-indisponivel");
      }

      const token = await usuarioModel.criarTokenAlteracaoEmail(
        usuarioId,
        email,
      );
      const envio = await enviarEmailConfirmacaoEmail(email, token, req);

      if (!envio.ok) {
        await usuarioModel.cancelarTokenAlteracaoEmail(usuarioId);
        return res.redirect("/configuracoes?perfil=email-erro");
      }

      return res.redirect(
        `/configuracoes?perfil=${envio.simulated ? "email-simulado" : "email-pendente"}`,
      );
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      return res.redirect("/configuracoes?perfil=erro");
    }
  },

  confirmarAlteracaoEmail: async (req, res) => {
    const resultado = await usuarioModel.confirmarAlteracaoEmail(
      String(req.params.token || "").trim(),
    );

    if (resultado?.sucesso) {
      req.session.emailAlteradoComSucesso = true;

      if (req.session?.usuario?.id === resultado.usuarioId) {
        req.session.usuario.email = resultado.email;
      }
    }

    return res.render("pages/public/confirmacao-email", {
      sucesso: Boolean(resultado?.sucesso),
      autenticado: Boolean(req.session?.usuario),
    });
  },

  exibirCadastroCliente: (req, res) => {
    res.render("pages/auth/cadastro", {
      valores: {},
      erroValidacao: {},
      msgErro: {},
    });
  },

  cadastrarCliente: async (req, res) => {
    const errors = validationResult(req);
    const erroValidacao = {},
      msgErro = {};
    const isAjax =
      req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest";

    if (!errors.isEmpty()) {
      errors.array().forEach((e) => {
        erroValidacao[e.path] = "erro";
        msgErro[e.path] = e.msg;
      });

      if (isAjax) {
        return res
          .status(400)
          .json({ sucesso: false, erroValidacao, msgErro, tipo: "validacao" });
      }

      return res.render("pages/auth/cadastro", {
        valores: req.body,
        erroValidacao,
        msgErro,
        retorno: null,
      });
    }

    try {
      if (await usuarioModel.emailExiste(req.body.email)) {
        erroValidacao.email = "erro";
        msgErro.email = "*E-mail já cadastrado!";
        if (isAjax) {
          return res
            .status(400)
            .json({ sucesso: false, erroValidacao, msgErro, tipo: "email" });
        }
        return res.render("pages/auth/cadastro", {
          valores: req.body,
          erroValidacao,
          msgErro,
          retorno: null,
        });
      }

      if (await usuarioModel.nomeUsuarioExiste(req.body.nomeusuario)) {
        erroValidacao.nomeusuario = "erro";
        msgErro.nomeusuario = "*Nome de usuário em uso!";
        if (isAjax) {
          return res.status(400).json({
            sucesso: false,
            erroValidacao,
            msgErro,
            tipo: "nomeusuario",
          });
        }
        return res.render("pages/auth/cadastro", {
          valores: req.body,
          erroValidacao,
          msgErro,
          retorno: null,
        });
      }

      const novoUsuario = await usuarioModel.criarCliente({
        nome: req.body.nome,
        nomeusuario: req.body.nomeusuario,
        email: req.body.email,
        senha: req.body.senha,
      });

      req.session.usuario = { ...novoUsuario };
      req.session.usuario.onboarding_concluido =
        !!novoUsuario.onboarding_concluido;
      req.session.nome = novoUsuario.nome;
      delete req.session.usuario.senha;

      if (isAjax) {
        return res.json({ sucesso: true, redirect: "/onboarding" });
      }

      res.redirect("/onboarding");
    } catch (err) {
      console.error("Erro ao cadastrar cliente:", err);
      if (isAjax) {
        return res
          .status(500)
          .json({ sucesso: false, msgErro: { geral: "Erro interno." } });
      }
      res.render("pages/auth/cadastro", {
        valores: req.body,
        erroValidacao: {},
        msgErro: {},
        retorno: "Erro interno.",
      });
    }
  },

  exibirLogin: (req, res) => {
    res.render("pages/auth/login", {
      erro: null,
      valores: { email: "" },
      erroValidacao: {},
      msgErro: {},
      sucesso: false,
    });
  },

  exibirRecuperacaoSenha: (req, res) => {
    res.render("pages/auth/recuperar-senha", {
      erro: null,
      email: "",
      sucesso: false,
      mensagemSucesso: "",
    });
  },

  exibirAlteracaoSenha: async (req, res) => {
    const email = req.session?.usuario?.email;
    const tokenInfo = await usuarioModel.gerarTokenRecuperacao(email);

    if (!tokenInfo?.token) {
      return res.redirect("/configuracoes");
    }

    return res.redirect(`/redefinir-senha/${tokenInfo.token}`);
  },

  solicitarRecuperacaoSenha: async (req, res) => {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.render("pages/auth/recuperar-senha", {
        erro: "Informe um e-mail válido.",
        email,
        sucesso: false,
        mensagemSucesso: "",
      });
    }

    try {
      const usuario = await usuarioModel.buscarPorEmail(email);
      if (usuario) {
        const tokenInfo = await usuarioModel.gerarTokenRecuperacao(email);
        if (tokenInfo?.token) {
          await enviarEmailResetSenha(email, tokenInfo.token, req);
        }
      }

      return res.render("pages/auth/recuperar-senha", {
        erro: null,
        email,
        sucesso: true,
        mensagemSucesso:
          "Se esse e-mail estiver cadastrado, enviamos um link para redefinir sua senha.",
      });
    } catch (error) {
      console.error("Erro ao solicitar recuperação de senha:", error);
      return res.render("pages/auth/recuperar-senha", {
        erro: "Não foi possível enviar o link de recuperação. Tente novamente.",
        email,
        sucesso: false,
        mensagemSucesso: "",
      });
    }
  },

  exibirRedefinicaoSenha: async (req, res) => {
    const token = String(req.params.token || "").trim();
    const tokenValido = await usuarioModel.buscarPorTokenRecuperacao(token);

    if (!tokenValido) {
      return res.render("pages/auth/redefinir-senha", {
        token,
        invalido: true,
        mensagem: "Este link de redefinição expirou ou é inválido.",
      });
    }

    return res.render("pages/auth/redefinir-senha", {
      token,
      invalido: false,
      erro: null,
      sucesso: false,
    });
  },

  processarRedefinicaoSenha: async (req, res) => {
    const token = String(req.params.token || "").trim();
    const novaSenha = String(req.body.novaSenha || "");
    const confirmarSenha = String(req.body.confirmarSenha || "");

    const tokenValido = await usuarioModel.buscarPorTokenRecuperacao(token);
    if (!tokenValido) {
      return res.render("pages/auth/redefinir-senha", {
        token,
        invalido: true,
        mensagem: "Este link de redefinição expirou ou é inválido.",
      });
    }

    if (
      !novaSenha ||
      !/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(novaSenha)
    ) {
      return res.render("pages/auth/redefinir-senha", {
        token,
        invalido: false,
        erro: "Use 8+ caracteres, incluindo letra maiúscula, número e símbolo.",
        sucesso: false,
      });
    }

    if (novaSenha !== confirmarSenha) {
      return res.render("pages/auth/redefinir-senha", {
        token,
        invalido: false,
        erro: "As senhas não coincidem.",
        sucesso: false,
      });
    }

    try {
      const ok = await usuarioModel.alterarSenhaComToken(token, novaSenha);
      if (!ok) {
        return res.render("pages/auth/redefinir-senha", {
          token,
          invalido: true,
          mensagem: "Não foi possível redefinir a senha com este link.",
        });
      }

      return res.render("pages/auth/redefinir-senha", {
        token,
        invalido: false,
        erro: null,
        sucesso: true,
      });
    } catch (error) {
      console.error("Erro ao processar redefinição de senha:", error);
      return res.render("pages/auth/redefinir-senha", {
        token,
        invalido: false,
        erro: "Ocorreu um erro ao salvar a nova senha.",
        sucesso: false,
      });
    }
  },

  exibirConfirmacaoGoogle: (req, res) => {
    const dados = req.session.googleAuth;

    if (!dados?.email) {
      return res.redirect("/login");
    }

    res.render("pages/auth/google-confirmacao", {
      dados,
      usuario: req.session.usuario || null,
      valores: {
        nome: dados.nome || "",
        email: dados.email || "",
        nomeusuario: "",
      },
      erroValidacao: {},
      msgErro: {},
    });
  },

  confirmarLoginGoogle: (req, res) => {
    const dados = req.session.googleAuth;
    if (!dados?.usuario) {
      return res.redirect("/login");
    }

    const usuario = { ...dados.usuario };
    delete usuario.senha;
    req.session.usuario = usuario;
    req.session.usuario.onboarding_concluido = !!usuario.onboarding_concluido;
    req.session.nome = usuario.nome;
    delete req.session.googleAuth;

    const redirectUrl = req.session.usuario.onboarding_concluido
      ? "/dashboard"
      : "/onboarding";

    return req.session.save((error) => {
      if (error) {
        console.error("Erro ao salvar sessão após login Google:", error);
        return res.redirect("/login?erro=sessao");
      }

      return res.redirect(redirectUrl);
    });
  },

  cancelarLoginGoogle: (req, res) => {
    delete req.session.googleAuth;
    res.redirect("/login");
  },

  concluirCadastroGoogle: async (req, res) => {
    const dados = req.session.googleAuth;
    if (!dados?.email) {
      return res.redirect("/login");
    }

    const nome = String(req.body.nome || "").trim();
    const nomeusuario = String(req.body.nomeusuario || "").trim();
    const senha = String(req.body.senha || "");
    const confirmarSenha = String(req.body.confirmarSenha || "");
    const erroValidacao = {};
    const msgErro = {};

    if (
      !nome ||
      nome.length < 3 ||
      nome.length > 50 ||
      !/^[A-Za-zÀ-ú\s]+$/.test(nome)
    ) {
      erroValidacao.nome = "erro";
      msgErro.nome = "Nome inválido.";
    }

    if (
      !nomeusuario ||
      !/^[a-zA-Z0-9_-]+$/.test(nomeusuario) ||
      nomeusuario.length < 3 ||
      nomeusuario.length > 30
    ) {
      erroValidacao.nomeusuario = "erro";
      msgErro.nomeusuario = "Use apenas letras, números, hífen ou underscore.";
    } else if (await usuarioModel.nomeUsuarioExiste(nomeusuario)) {
      erroValidacao.nomeusuario = "erro";
      msgErro.nomeusuario = "Nome de usuário indisponível.";
    }

    if (!senha || !/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(senha)) {
      erroValidacao.senha = "erro";
      msgErro.senha = "Use 8+ caracteres, letra maiúscula, número e símbolo.";
    }

    if (!confirmarSenha || confirmarSenha !== senha) {
      erroValidacao.confirmarSenha = "erro";
      msgErro.confirmarSenha = "As senhas não coincidem.";
    }

    if (await usuarioModel.emailExiste(dados.email)) {
      erroValidacao.email = "erro";
      msgErro.email = "Já existe uma conta utilizando este e-mail.";
    }

    if (Object.keys(erroValidacao).length > 0) {
      return res.render("pages/auth/google-confirmacao", {
        dados,
        usuario: req.session.usuario || null,
        valores: { nome, email: dados.email, nomeusuario },
        erroValidacao,
        msgErro,
      });
    }

    try {
      const novoUsuario = await usuarioModel.criarClienteGoogle({
        nome,
        nomeusuario,
        email: dados.email,
        foto_perfil: dados.foto_perfil || null,
        senha,
      });

      delete req.session.googleAuth;
      req.session.usuario = { ...novoUsuario };
      req.session.usuario.onboarding_concluido =
        !!novoUsuario.onboarding_concluido;
      req.session.nome = novoUsuario.nome;
      delete req.session.usuario.senha;

      req.session.save((error) => {
        if (error) {
          console.error("Erro ao salvar sessão após cadastro Google:", error);
          return res.redirect("/login?erro=sessao");
        }

        return res.redirect("/onboarding");
      });
    } catch (error) {
      console.error("Erro ao concluir cadastro Google:", error);
      res.render("pages/auth/google-confirmacao", {
        dados,
        usuario: req.session.usuario || null,
        valores: { nome, email: dados.email, nomeusuario },
        erroValidacao: {},
        msgErro: { geral: "Erro interno ao criar a conta." },
      });
    }
  },

  // Login com bcrypt
  login: async (req, res) => {
    const login = req.body["email-login"];
    const senha = req.body["senha-login"];
    console.log("[DEBUG] login attempt:", { login });
    try {
      const usuario = await usuarioModel.buscarPorLogin(login);
      console.log("[DEBUG] buscarPorLogin result:", usuario);
      if (!usuario) {
        return res.render("pages/auth/login", {
          erro: "⚠️ Usuário ou senha incorretos.",
          valores: { email: login },
          erroValidacao: {},
          msgErro: {},
          sucesso: false,
        });
      }
      // tenta bcrypt; se falhar (senha antiga sem hash), compara direto
      let senhaOk = false;
      try {
        senhaOk = await usuarioModel.verificarSenha(senha, usuario.senha);
      } catch (_) {
        senhaOk = senha === usuario.senha;
      }

      if (!senhaOk) {
        return res.render("pages/auth/login", {
          erro: "⚠️ Usuário ou senha incorretos.",
          valores: { email: login },
          erroValidacao: {},
          msgErro: {},
          sucesso: false,
        });
      }
      delete usuario.senha;
      req.session.usuario = usuario;
      req.session.usuario.onboarding_concluido = !!usuario.onboarding_concluido;
      req.session.nome = usuario.nome;

      return req.session.usuario.onboarding_concluido
        ? res.redirect("/dashboard")
        : res.redirect("/onboarding");
    } catch (err) {
      console.error("Erro no login:", err);
      return res.render("pages/auth/login", {
        erro: "Erro interno.",
        valores: { email: login },
        erroValidacao: {},
        msgErro: {},
        sucesso: false,
      });
    }
  },

  enviarSolicitacaoSuporte: async (req, res) => {
    const nome = String(req.body.nome || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const tipo = String(req.body.tipo || "").trim();
    const mensagem = String(req.body.mensagem || "").trim();
    const tiposPermitidos = [
      "Problema com login",
      "Erro no sistema",
      "Dúvida sobre tarefas",
      "Outro",
    ];

    if (
      nome.length < 2 ||
      nome.length > 100 ||
      email.length > 150 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !tiposPermitidos.includes(tipo) ||
      mensagem.length < 10 ||
      mensagem.length > 3000
    ) {
      return res.redirect("/ajuda?secao=contato&suporte=invalido");
    }

    try {
      await adminModel.criarSolicitacaoSuporte({
        usuarioId: req.session?.usuario?.id || null,
        nome,
        email,
        tipo,
        mensagem,
      });

      return res.redirect("/ajuda?secao=contato&suporte=recebido");
    } catch (error) {
      console.error("[Suporte.enviarSolicitacao]", error);
      return res.redirect("/ajuda?secao=contato&suporte=erro");
    }
  },

  logout: (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
  },
};

module.exports = usuarioController;
