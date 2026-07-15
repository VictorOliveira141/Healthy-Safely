
const express = require("express");
const router = express.Router();
const passport = require("passport");

const iaRoutes = require("./ia-routes");

const usuarioController = require("../controllers/usuarioController");
const tarefaController = require("../controllers/tarefaController");

/* ============================================================
   MIDDLEWARES
============================================================ */

function apenasAutenticado(req, res, next) {
  if (!req.session?.usuario) return res.redirect("/login");
  next();
}

/* ============================================================
   MÓDULOS
============================================================ */

router.use("/ia", iaRoutes);

/* ============================================================
   ROTAS PÚBLICAS
============================================================ */

router.get("/", (req, res) => {
  if (req.session?.usuario) {
       return res.redirect("/dashboard");
    }
    res.render("pages/tomarammeutela");
});

router.get("/ajuda", (req, res) => res.render("pages/ajuda"));

router.get("/configuracoes", (req, res) =>
  res.render("pages/configuracoes"),
);

/* ============================================================
   AUTENTICAÇÃO
============================================================ */

router.get("/login", (req, res) => {
  if (req.session?.usuario) {
    return req.session.usuario.tipo === "profissional"
      ? res.redirect("/profissional/painel-financeiro")
      : res.redirect("/dashboard");
  }

  usuarioController.exibirLogin(req, res);
});

router.post("/login", usuarioController.login);

router.get("/logout", usuarioController.logout);
router.get("/sair", usuarioController.logout);

/* ============================================================
   CADASTRO
============================================================ */

router.get("/cadastro", (req, res) => {
  if (req.session?.usuario) {
    return req.session.usuario.tipo === "profissional"
      ? res.redirect("/profissional/painel-financeiro")
      : res.redirect("/dashboard");
  }

  res.render("pages/cadastro", {
    valores: {},
    erroValidacao: {},
    msgErro: {},
  });
});

router.get(
  "/cadastroCliente",
  usuarioController.exibirCadastroCliente,
);

router.get(
  "/cadastroProfissional",
  usuarioController.exibirCadastroProfissional,
);

router.post(
  "/cadastroCliente",
  usuarioController.regrasValidacaoCliente,
  usuarioController.cadastrarCliente,
);

router.post(
  "/cadastroProfissional",
  usuarioController.regrasValidacaoProfissional,
  usuarioController.cadastrarProfissional,
);

/* ============================================================
   GOOGLE OAUTH
============================================================ */

router.get(
  "/auth/google",
  (req, res, next) => {
    if (
      !process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET
    ) {
      return res
        .status(500)
        .send(
          "Google OAuth não está configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.",
        );
    }

    req.session.returnTo = req.query.returnTo || "/dashboard";
    req.session.googleFlow = req.query.flow || "login";

    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login?erro=google",
  }),
  (req, res) => {
    const dadosGoogle = req.user || {};

    req.session.googleAuth = {
      email: dadosGoogle.email,
      nome: dadosGoogle.nome,
      foto_perfil: dadosGoogle.foto_perfil,
      usuario: dadosGoogle.usuario || null,
      flow: req.session.googleFlow || "login",
      possuiConta: !!dadosGoogle.usuario,
    };

    return res.redirect("/google/loading");
  },
);

router.get("/google/loading", (req, res) => {
  if (!req.session.googleAuth) {
    return res.redirect("/login");
  }

  res.render("pages/google-loading");
});

router.get(
  "/google/confirmacao",
  usuarioController.exibirConfirmacaoGoogle,
);

router.post(
  "/google/confirmacao",
  usuarioController.confirmarLoginGoogle,
);

router.post(
  "/google/cadastro",
  usuarioController.concluirCadastroGoogle,
);

router.post(
  "/google/cancelar",
  usuarioController.cancelarLoginGoogle,
);

/* ============================================================
   APIs
============================================================ */

router.get(
  "/api/cadastro/disponibilidade",
  usuarioController.verificarDisponibilidade,
);

router.get(
  "/api/profissionais",
  apenasAutenticado,
  tarefaController.buscarProfissionais,
);

/* ============================================================
   ÁREA DO CLIENTE
============================================================ */

/* ---------------- Dashboard ---------------- */

router.get(
  "/dashboard",
  apenasAutenticado,
  tarefaController.exibirDashboard,
);

/* ---------------- Programas ---------------- */

router.get("/programas", apenasAutenticado, (req, res) =>
  res.render("user/programas"),
);

router.get("/programas-detalhes", apenasAutenticado, (req, res) =>
  res.render("user/programas-detalhes"),
);

/* ---------------- Tarefas ---------------- */

router.get("/tasks", apenasAutenticado, tarefaController.listarTarefas);

router.post(
  "/tasks/criar",
  apenasAutenticado,
  tarefaController.regrasValidacaoTarefa,
  tarefaController.criarTarefa,
);

router.get(
  "/tasks/concluir",
  apenasAutenticado,
  tarefaController.alternarConclusao,
);

router.post(
  "/tasks/excluir/:id",
  apenasAutenticado,
  tarefaController.excluirTarefa,
);

/* ---------------- Profissionais ---------------- */

router.post(
  "/vincular-profissional",
  apenasAutenticado,
  tarefaController.solicitarVinculo,
);

/* ---------------- Saúde ---------------- */

router.get("/sono", apenasAutenticado, async (req, res) => {
  const { usuarioModel } = require("../models/Usuario");

  const registros = await usuarioModel.listarSono(
    req.session.usuario.id,
  );

  const flash = req.session.flash || null;
  delete req.session.flash;

  res.render("pages/sono", { registros, flash });
});

router.post(
  "/sono/registrar",
  apenasAutenticado,
  tarefaController.registrarSono,
);

router.get("/saude-mental", apenasAutenticado, (req, res) =>
  res.render("pages/saude-mental"),
);

router.get("/atividade-fisica", apenasAutenticado, (req, res) =>
  res.render("pages/atividade-fisica"),
);

router.get("/alimentacao", apenasAutenticado, (req, res) =>
  res.render("pages/alimentacao"),
);

/* ---------------- Histórico ---------------- */

router.get(
  "/historico",
  apenasAutenticado,
  tarefaController.exibirHistorico,
);

/* ============================================================
   ÁREA AUTENTICADA
============================================================ */

router.get("/perfil", apenasAutenticado, async (req, res) => {
  const { usuarioModel } = require("../models/Usuario");

  const usuario =
    (await usuarioModel.buscarPerfilCompleto(
      req.session.usuario.id,
    )) || req.session.usuario;

  res.render("pages/perfil", { usuario });
});

router.get(
  "/notificacoes",
  apenasAutenticado,
  async (req, res) => {
    const { usuarioModel } = require("../models/Usuario");

    const notificacoes =
      await usuarioModel.listarNotificacoes(
        req.session.usuario.id,
      );

    res.render("pages/notificacoes", { notificacoes });
  },
);

router.post(
  "/notificacoes/marcar-lidas",
  apenasAutenticado,
  async (req, res) => {
    const { usuarioModel } = require("../models/Usuario");

    await usuarioModel.marcarTodasLidas(
      req.session.usuario.id,
    );

    res.redirect("/notificacoes");
  },
);

router.get("/privacidade", apenasAutenticado, (req, res) =>
  res.render("pages/privacidade"),
);

/* ============================================================
   TESTES
============================================================ */

router.get("/teste", (req, res) => {
  res.json({ ok: true });
});

/* ============================================================
   EXPORTAÇÃO
============================================================ */

module.exports = router;