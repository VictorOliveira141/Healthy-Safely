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
   APP (núcleo do site)
============================================================ */

/* ---------------- Dashboard ---------------- */

router.get("/dashboard", apenasAutenticado, (req, res) => {
  console.log("ENTROU NO DASHBOARD");
  console.log(req.session.usuario);

  tarefaController.exibirDashboard(req, res);
});
/* ---------------- Histórico ---------------- */

router.get("/historico", apenasAutenticado, tarefaController.exibirHistorico);

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

/* ---------------- Saúde ---------------- */

router.get("/sono", apenasAutenticado, async (req, res) => {
  const { usuarioModel } = require("../models/Usuario");

  const registros = await usuarioModel.listarSono(req.session.usuario.id);

  const flash = req.session.flash || null;
  delete req.session.flash;

  res.render("pages/app/sono", { registros, flash });
});

router.post(
  "/sono/registrar",
  apenasAutenticado,
  tarefaController.registrarSono,
);

router.get("/saude-mental", apenasAutenticado, (req, res) =>
  res.render("pages/app/saude-mental"),
);

router.get("/atividade-fisica", apenasAutenticado, (req, res) =>
  res.render("pages/app/atividade-fisica"),
);

router.get("/alimentacao", apenasAutenticado, (req, res) =>
  res.render("pages/app/alimentacao"),
);

/* ============================================================
   AUTH (cadatro, login, mudar senha, confirmações)
============================================================ */

/* ---------------- Login ---------------- */
router.get("/login", (req, res) => {
  if (req.session?.usuario) {
    return res.redirect("/dashboard");
  }

  res.render("pages/auth/login", {
    erro: null,
    valores: { email: "" },
    erroValidacao: {},
    msgErro: {},
    sucesso: false,
  });
});
router.post("/login", usuarioController.login);

/* ---------------- Cadastro ---------------- */
router.get("/cadastro", (req, res) => {
  if (req.session?.usuario) {
    return res.redirect("/dashboard");
  }

  res.render("pages/auth/cadastro", {
    valores: {},
    erroValidacao: {},
    msgErro: {},
  });
});

router.get("/cadastroCliente", usuarioController.exibirCadastroCliente);
router.post(
  "/cadastroCliente",
  usuarioController.regrasValidacaoCliente,
  usuarioController.cadastrarCliente,
);

/* ---------------- Confirmação com google ---------------- */
router.get(
  "/auth/google",
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
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

  res.render("pages/auth/google-loading");
});

router.get("/google/confirmacao", usuarioController.exibirConfirmacaoGoogle);

router.post("/google/confirmacao", usuarioController.confirmarLoginGoogle);

router.post("/google/cadastro", usuarioController.concluirCadastroGoogle);

router.post("/google/cancelar", usuarioController.cancelarLoginGoogle);

/* ============================================================
   Marketing (apresentação, pagina de compras, suporte)
============================================================ */

router.get("/", (req, res) => {
  if (req.session?.usuario) {
    return res.redirect("/dashboard");
  }
  res.render("pages/marketing/tomarammeutela");
});

router.get("/ajuda", (req, res) => res.render("pages/marketing/ajuda"));

/* ============================================================
   User (configurações, notificações, perfil, privacidade)
============================================================ */

/* ---------------- Perfil ---------------- */
router.get("/perfil", apenasAutenticado, async (req, res) => {
  const { usuarioModel } = require("../models/Usuario");

  const usuario =
    (await usuarioModel.buscarPerfilCompleto(req.session.usuario.id)) ||
    req.session.usuario;

  res.render("pages/user/perfil", { usuario });
});

router.get("/logout", usuarioController.logout);
router.get("/sair", usuarioController.logout);

/* ---------------- Notificações ---------------- */
router.get("/notificacoes", apenasAutenticado, async (req, res) => {
  const { usuarioModel } = require("../models/Usuario");

  const notificacoes = await usuarioModel.listarNotificacoes(
    req.session.usuario.id,
  );

  res.render("pages/user/notificacoes", { notificacoes });
});

router.post(
  "/notificacoes/marcar-lidas",
  apenasAutenticado,
  async (req, res) => {
    const { usuarioModel } = require("../models/Usuario");

    await usuarioModel.marcarTodasLidas(req.session.usuario.id);

    res.redirect("/notificacoes");
  },
);

/* ---------------- Configurações ---------------- */
router.get("/configuracoes", apenasAutenticado, (req, res) =>
  res.render("pages/user/configuracoes"),
);

/* ---------------- Privacidade ---------------- */
router.get("/privacidade", apenasAutenticado, (req, res) =>
  res.render("pages/user/privacidade"),
);

/* ============================================================
   APIs
============================================================ */

router.get(
  "/api/cadastro/disponibilidade",
  usuarioController.verificarDisponibilidade,
);

/* ============================================================
   TESTES
============================================================ */

router.get("/teste", (req, res) => {
  res.json({ ok: true });
});
router.get("/onboarding",(req, res) =>
  res.render("pages/marketing/onboarding"),
);

/* ============================================================
   EXPORTAÇÃO
============================================================ */

module.exports = router;
