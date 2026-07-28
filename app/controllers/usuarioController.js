const { usuarioModel } = require("../models/Usuario");
const { body, validationResult } = require("express-validator");

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
          resposta.nomeusuario = {
            valor,
            disponivel: !(await usuarioModel.nomeUsuarioExiste(valor)),
          };
        }
      }

      res.json(resposta);
    } catch (err) {
      console.error("Erro ao verificar disponibilidade:", err);
      res.status(500).json({ erro: "Erro interno." });
    }
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
      req.session.nome = novoUsuario.nome;
      req.session.nivel = novoUsuario.nivel || "iniciante";
      delete req.session.usuario.senha;

      if (isAjax) {
        return res.json({ sucesso: true, redirect: "/dashboard" });
      }

      res.redirect("/dashboard");
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

  exibirConfirmacaoGoogle: (req, res) => {
    const dados = req.session.googleAuth;

    if (!dados?.email) {
      return res.redirect("/login");
    }

    res.render("pages/auth/google-confirmacao", {
      dados,
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
    req.session.nome = usuario.nome;
    req.session.nivel = usuario.nivel || "iniciante";

    return res.redirect("/dashboard");
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
      req.session.nome = novoUsuario.nome;
      req.session.nivel = novoUsuario.nivel || "iniciante";
      delete req.session.usuario.senha;

      res.redirect("/dashboard");
    } catch (error) {
      console.error("Erro ao concluir cadastro Google:", error);
      res.render("pages/auth/google-confirmacao", {
        dados,
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
      req.session.nome = usuario.nome;
      req.session.nivel = usuario.nivel || "iniciante";
      return res.redirect("/dashboard");
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

  logout: (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
  },
};

module.exports = usuarioController;
