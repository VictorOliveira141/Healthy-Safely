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

  regrasValidacaoProfissional: [
    body("nome")
      .trim()
      .notEmpty()
      .withMessage("*Obrigatório!")
      .bail()
      .isLength({ min: 3, max: 50 })
      .withMessage("*3 a 50 caracteres!")
      .matches(/^[A-Za-zÀ-ú\s]+$/)
      .withMessage("*Somente letras!"),
    body("cref")
      .trim()
      .notEmpty()
      .withMessage("*Obrigatório!")
      .bail()
      .isLength({ min: 5, max: 20 })
      .withMessage("*CREF inválido!"),
    body("areaAtuacao").notEmpty().withMessage("*Selecione a área!"),
    body("tempoExperiencia")
      .notEmpty()
      .withMessage("*Obrigatório!")
      .bail()
      .isInt({ min: 0 })
      .withMessage("*Número positivo!"),
    body("especialidades")
      .trim()
      .notEmpty()
      .withMessage("*Obrigatório!")
      .bail()
      .isLength({ min: 3, max: 200 })
      .withMessage("*3 a 200 caracteres!"),
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

  exibirCadastroCliente: (req, res) => {
    res.render("pages/cadastroCliente", {
      valores: {},
      erroValidacao: {},
      msgErro: {},
    });
  },

  exibirCadastroProfissional: (req, res) => {
    res.render("pages/cadastroProfissional", {
      valores: {},
      erroValidacao: {},
      msgErro: {},
    });
  },

  cadastrarCliente: async (req, res) => {
    const errors = validationResult(req);
    const erroValidacao = {},
      msgErro = {};
    if (!errors.isEmpty()) {
      errors.array().forEach((e) => {
        erroValidacao[e.path] = "erro";
        msgErro[e.path] = e.msg;
      });
      return res.render("pages/cadastroCliente", {
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
        return res.render("pages/cadastroCliente", {
          valores: req.body,
          erroValidacao,
          msgErro,
          retorno: null,
        });
      }
      if (await usuarioModel.nomeUsuarioExiste(req.body.nomeusuario)) {
        erroValidacao.nomeusuario = "erro";
        msgErro.nomeusuario = "*Nome de usuário em uso!";
        return res.render("pages/cadastroCliente", {
          valores: req.body,
          erroValidacao,
          msgErro,
          retorno: null,
        });
      }

      await usuarioModel.criarCliente({
        nome: req.body.nome,
        nomeusuario: req.body.nomeusuario,
        email: req.body.email,
        senha: req.body.senha,
      });

      res.redirect("/login");

    } catch (err) {
      console.error("Erro ao cadastrar cliente:", err);
      res.render("pages/cadastroCliente", {
        valores: req.body,
        erroValidacao: {},
        msgErro: {},
        retorno: "Erro interno.",
      });
    }
  },

  cadastrarProfissional: async (req, res) => {
    const errors = validationResult(req);
    const erroValidacao = {},
      msgErro = {};
    if (!errors.isEmpty()) {
      errors.array().forEach((e) => {
        erroValidacao[e.path] = "erro";
        msgErro[e.path] = e.msg;
      });
      return res.render("pages/cadastroProfissional", {
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
        return res.render("pages/cadastroProfissional", {
          valores: req.body,
          erroValidacao,
          msgErro,
          retorno: null,
        });
      }

      const novo = await usuarioModel.criarProfissional({
        nome: req.body.nome,
        nomeusuario: req.body.nomeusuario || null,
        email: req.body.email,
        senha: req.body.senha,
        cref: req.body.cref,
        areaAtuacao: req.body.areaAtuacao,
        tempoExperiencia: req.body.tempoExperiencia,
        especialidades: req.body.especialidades,
      });

      req.session.usuario = novo;
      req.session.nome = novo.nome;
      req.session.nivel = "profissional";
      res.redirect("/profissional/painel-financeiro");
    } catch (err) {
      console.error("Erro ao cadastrar profissional:", err);
      res.render("pages/cadastroProfissional", {
        valores: req.body,
        erroValidacao: {},
        msgErro: {},
        retorno: "Erro interno.",
      });
    }
  },

  exibirLogin: (req, res) => {
    res.render("pages/login", {
      erro: null,
      valores: { email: "" },
      erroValidacao: {},
      msgErro: {},
      sucesso: false,
    });
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
        return res.render("pages/login", {
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
        return res.render("pages/login", {
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
      if (usuario.tipo === "profissional")
        return res.redirect("/profissional/painel-financeiro");
      return res.redirect("/dashboard");
    } catch (err) {
      console.error("Erro no login:", err);
      return res.render("pages/login", {
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
