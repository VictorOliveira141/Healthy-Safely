const express = require("express");
const router = express.Router();
const iaRoutes = require("./ia-routes");

const usuarioController = require("../controllers/usuarioController");
const tarefaController = require("../controllers/tarefaController");

function apenasCliente(req, res, next) {
  if (!req.session?.usuario) return res.redirect("/login");
  if (req.session.usuario.tipo !== "cliente")
    return res.redirect("/profissional/painel-financeiro");
  next();
}
function apenasAutenticado(req, res, next) {
  if (!req.session?.usuario) return res.redirect("/login");
  next();
}

// LOGOUT
router.get("/sair", usuarioController.logout);
router.get("/logout", usuarioController.logout);

// IA
router.use("/ia", iaRoutes);

/* ── ROTAS PÚBLICAS ─────────────────────────────────────────────── */
router.get("/", (req, res) => {
  // Redireciona usuário logado
  if (req.session?.usuario) {
    if (req.session.usuario.tipo === "profissional")
      return res.redirect("/profissional/painel-financeiro");
    return res.redirect("/dashboard");
  }
  res.render("pages/tomarammeutela");
});

router.get("/ajuda", (req, res) => res.render("pages/ajuda"));
router.get("/configuracoes", (req, res) => res.render("pages/configuracoes"));
router.get("/cadastro", (req, res) => {
  // Redireciona logado para o dashboard
  if (req.session?.usuario) {
    return req.session.usuario.tipo === "profissional"
      ? res.redirect("/profissional/painel-financeiro")
      : res.redirect("/dashboard");
  }
  res.render("pages/cadastro");
});
router.get("/cadastroCliente", usuarioController.exibirCadastroCliente);
router.get(
  "/cadastroProfissional",
  usuarioController.exibirCadastroProfissional,
);
router.get("/login", (req, res) => {
  // Redireciona usuário já logado
  if (req.session?.usuario) {
    return req.session.usuario.tipo === "profissional"
      ? res.redirect("/profissional/painel-financeiro")
      : res.redirect("/dashboard");
  }
  usuarioController.exibirLogin(req, res);
});

/* ── APENAS CLIENTE ─────────────────────────────────────────────── */
router.get("/dashboard", apenasCliente, tarefaController.exibirDashboard);
router.get("/programas", apenasCliente, (req, res) =>
  res.render("user/programas"),
);
router.get("/programas-detalhes", apenasCliente, (req, res) =>
  res.render("user/programas-detalhes"),
);

// Tarefas
router.get("/tasks", apenasCliente, tarefaController.listarTarefas);
router.post(
  "/tasks/criar",
  apenasCliente,
  tarefaController.regrasValidacaoTarefa,
  tarefaController.criarTarefa,
);
router.get(
  "/tasks/concluir",
  apenasCliente,
  tarefaController.alternarConclusao,
);
router.post(
  "/tasks/excluir/:id",
  apenasCliente,
  tarefaController.excluirTarefa,
);

// Conectar profissionais
router.get(
  "/api/profissionais",
  apenasCliente,
  tarefaController.buscarProfissionais,
);
router.post(
  "/vincular-profissional",
  apenasCliente,
  tarefaController.solicitarVinculo,
);

// Páginas de saúde
router.get("/sono", apenasCliente, async (req, res) => {
  const { usuarioModel } = require("../models/Usuario");
  const registros = await usuarioModel.listarSono(req.session.usuario.id);
  const flash = req.session.flash || null;
  delete req.session.flash;
  res.render("pages/sono", { registros, flash });
});
router.post("/sono/registrar", apenasCliente, tarefaController.registrarSono);
router.get("/saude-mental", apenasCliente, (req, res) =>
  res.render("pages/saude-mental"),
);
router.get("/atividade-fisica", apenasCliente, (req, res) =>
  res.render("pages/atividade-fisica"),
);
router.get("/alimentacao", apenasCliente, (req, res) =>
  res.render("pages/alimentacao"),
);
router.get("/amizades", apenasCliente, (req, res) =>
  res.render("pages/amizades"),
);
router.get("/perfil-amizade", apenasCliente, (req, res) =>
  res.render("pages/perfil-amizade"),
);

// Histórico
router.get("/historico", apenasCliente, tarefaController.exibirHistorico);

/* ── AUTENTICADO (cliente ou profissional) ─────────────────────── */
router.get("/perfil", apenasAutenticado, async (req, res) => {
  const { usuarioModel } = require("../models/Usuario");
  const usuario =
    (await usuarioModel.buscarPerfilCompleto(req.session.usuario.id)) ||
    req.session.usuario;
  res.render("pages/perfil", { usuario });
});

router.get("/notificacoes", apenasAutenticado, async (req, res) => {
  const { usuarioModel } = require("../models/Usuario");
  const notificacoes = await usuarioModel.listarNotificacoes(
    req.session.usuario.id,
  );
  res.render("pages/notificacoes", { notificacoes });
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

router.get("/privacidade", apenasAutenticado, (req, res) =>
  res.render("pages/privacidade"),
);

/* ── POST cadastro / login ─────────────────────────────────────── */
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
router.post("/login", usuarioController.login);

module.exports = router;

router.get("/teste", async (req, res) => {
  res.json({ ok: true });
});
