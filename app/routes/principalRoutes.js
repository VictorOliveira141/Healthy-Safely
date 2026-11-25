const express = require("express");
const router = express.Router();
const passport = require("passport");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const iaRoutes = require("./ia-routes");

const usuarioController = require("../controllers/usuarioController");
const webauthnController = require("../controllers/webauthnController");
const tarefaController = require("../controllers/tarefaController");
const pushController = require("../controllers/pushController");
const assinaturaController = require("../controllers/assinaturaController");
const { tarefaModel } = require("../models/Tarefa");
const { relatorioPremiumModel } = require("../models/RelatorioPremium");
const { gerarRelatorioSemanal } = require("../services/iaService");
const {
  hojeSaoPaulo,
  somarDias,
  inicioDaSemana,
  calcularAnalisePremium,
} = require("../utils/progressao");
const { PRECO_PREMIUM } = require("../config/planos");
const { buildGoogleCallbackUrl } = require("../config/googleAuth");
const { usuarioModel } = require("../models/Usuario");
const { premiumAtivo } = require("../utils/premium");

const extensoesFotoPerfil = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const uploadPerfil = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      const destino = path.join(__dirname, "../public/uploads/perfis");
      fs.mkdir(destino, { recursive: true }, (error) =>
        callback(error, destino),
      );
    },
    filename: (req, file, callback) => {
      callback(
        null,
        `${crypto.randomUUID()}${extensoesFotoPerfil[file.mimetype]}`,
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    callback(null, Boolean(extensoesFotoPerfil[file.mimetype]));
  },
});

/* ============================================================
   MIDDLEWARES
============================================================ */

function apenasAutenticado(req, res, next) {
  if (!req.session?.usuario) return res.redirect("/login");
  next();
}

async function onboardingConcluido(req, res, next) {
  if (!req.session?.usuario) return res.redirect("/login");

  try {
    const usuario = await usuarioModel.buscarPorId(req.session.usuario.id);

    if (!usuario?.onboarding_concluido) {
      req.session.usuario.onboarding_concluido = false;
      return res.redirect("/onboarding");
    }

    req.session.usuario.onboarding_concluido = true;
    req.session.usuario.plano = premiumAtivo(usuario) ? "premium" : "free";
    req.session.usuario.premium_ate = usuario.premium_ate;
    req.session.usuario.premium_ativo = usuario.premium_ativo;
    req.session.usuario.assinatura_status = usuario.assinatura_status;
    req.session.usuario.mp_preapproval_id = usuario.mp_preapproval_id;
    next();
  } catch (error) {
    console.error("Erro ao verificar status do onboarding:", error);
    res.redirect("/onboarding");
  }
}

/* ============================================================
   MÓDULOS
============================================================ */

router.use("/ia", apenasAutenticado, onboardingConcluido, iaRoutes);

// Registrar antes dos middlewares de sessão: este endpoint de cron autentica
// exclusivamente pelo header X-Cron-Secret no controller.
router.get("/api/push/cron", pushController.executarCron);

// O login biométrico é público; estas rotas devem preceder a proteção de
// onboarding aplicada ao prefixo /webauthn.
router.post("/webauthn/login/options", webauthnController.gerarOpcoesLogin);
router.post("/webauthn/login/verify", webauthnController.verificarLogin);

router.use(
  [
    "/dashboard",
    "/historico",
    "/tasks",
    "/perfil",
    "/conta",
    "/configuracoes",
    "/alterar-senha",
    "/assinatura",
    "/privacidade",
    "/api/push",
    "/api/configuracoes",
    "/webauthn",
  ],
  onboardingConcluido,
);

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

router.get(
  "/tasks/editar/:id",
  apenasAutenticado,
  tarefaController.buscarTarefaParaEdicao,
);

router.post(
  "/tasks/criar",
  apenasAutenticado,
  tarefaController.regrasValidacaoTarefa,
  tarefaController.criarTarefa,
);

router.post(
  "/tasks/atualizar/:id",
  apenasAutenticado,
  tarefaController.regrasValidacaoTarefa,
  tarefaController.atualizarTarefa,
);

router.post(
  "/tasks/concluir/:id",
  apenasAutenticado,
  tarefaController.concluirPeloPush,
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

/* ============================================================
   AUTH (cadatro, login, mudar senha, confirmações)
============================================================ */

/* ---------------- Login ---------------- */
router.get("/login", (req, res) => {
  if (req.session?.usuario) {
    return res.redirect("/dashboard");
  }

  const mensagemSucesso =
    req.query.senha === "alterada"
      ? "Sua senha foi alterada. Entre novamente usando a nova senha."
      : req.query.conta === "excluida"
        ? "Sua conta foi excluída com sucesso."
        : null;

  res.render("pages/auth/login", {
    erro: null,
    valores: { email: "" },
    erroValidacao: {},
    msgErro: {},
    sucesso: false,
    mensagemSucesso,
  });
});
router.post("/login", usuarioController.login);

/* ---------------- Recuperação de senha ---------------- */
router.get("/recuperar-senha", usuarioController.exibirRecuperacaoSenha);
router.post("/recuperar-senha", usuarioController.solicitarRecuperacaoSenha);
router.get(
  "/alterar-senha",
  apenasAutenticado,
  usuarioController.exibirAlteracaoSenha,
);
router.get("/redefinir-senha/:token", usuarioController.exibirRedefinicaoSenha);
router.post(
  "/redefinir-senha/:token",
  usuarioController.processarRedefinicaoSenha,
);

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
  (req, res, next) => {
    const callbackURL = buildGoogleCallbackUrl(req);
    req.session.googleCallbackURL = callbackURL;

    passport.authenticate("google", {
      scope: ["profile", "email"],
      callbackURL,
    })(req, res, next);
  },
);

router.get(
  "/auth/google/callback",
  (req, res, next) => {
    const callbackURL =
      req.session.googleCallbackURL || buildGoogleCallbackUrl(req);
    req.session.googleCallbackURL = callbackURL;

    passport.authenticate("google", {
      callbackURL,
      failureRedirect: "/login?erro=google",
    })(req, res, next);
  },
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

    return req.session.save((error) => {
      if (error) {
        console.error("Erro ao salvar sessão do Google:", error);
        return res.redirect("/login?erro=sessao");
      }

      return res.redirect("/google/loading");
    });
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
  res.render("pages/public/tomarammeutela", { precoPremium: PRECO_PREMIUM });
});

router.get("/ajuda", (req, res) => {
  const mensagensSuporte = {
    recebido: "Mensagem enviada. Nossa equipe responderá pelo e-mail informado.",
    invalido: "Confira os dados e a mensagem antes de enviar novamente.",
    erro: "Não foi possível enviar sua solicitação. Tente novamente.",
  };

  res.render("pages/public/ajuda", {
    mensagemSuporte: mensagensSuporte[req.query.suporte] || null,
  });
});
router.post("/suporte", usuarioController.enviarSolicitacaoSuporte);

/* ============================================================
  User (configurações, perfil, privacidade)
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

/* ---------------- Configurações ---------------- */
router.get("/configuracoes", apenasAutenticado, (req, res) => {
  const mensagemEmailAlterado = req.session.emailAlteradoComSucesso;
  delete req.session.emailAlteradoComSucesso;
  req.session.tokenExclusaoConta = crypto.randomBytes(32).toString("hex");

  const mensagensConfig = {
    salvo: "Perfil atualizado.",
    invalid: "Confira os dados informados e tente novamente.",
    indisponivel: "Este nome de usuário já está em uso.",
    "email-indisponivel": "Este e-mail já está cadastrado.",
    "email-pendente":
      "Enviamos um link para confirmar seu novo e-mail. O endereço atual continua ativo até a confirmação.",
    "email-simulado":
      "O link de confirmação não foi enviado: o serviço de e-mail está em modo simulado. Verifique os logs do servidor.",
    "email-erro":
      "Não foi possível enviar o link de confirmação. Tente novamente.",
    erro: "Não foi possível salvar as alterações. Tente novamente.",
  };
  const mensagensExclusao = {
    assinatura:
      "Não foi possível cancelar sua assinatura; por segurança, a conta não foi excluída.",
    "nao-encontrada": "A conta não foi encontrada e não pôde ser excluída.",
    erro:
      "Não foi possível excluir a conta. Se você tinha uma assinatura, ela foi cancelada para evitar novas cobranças.",
  };
  const perfisComErro = [
    "invalid",
    "indisponivel",
    "email-indisponivel",
    "email-erro",
    "erro",
  ];
  const tipoMensagemConfig =
    mensagemEmailAlterado || req.query.perfil === "salvo"
      ? "sucesso"
      : perfisComErro.includes(req.query.perfil) || req.query.exclusao
        ? "erro"
        : "info";

  res.render("pages/user/configuracoes", {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
    mensagemConfig: mensagemEmailAlterado
      ? "E-mail trocado com sucesso."
      : mensagensExclusao[req.query.exclusao] ||
        mensagensConfig[req.query.perfil] ||
        null,
    tipoMensagemConfig,
    tokenExclusaoConta: req.session.tokenExclusaoConta,
  });
});
router.post(
  "/perfil/editar",
  apenasAutenticado,
  uploadPerfil.single("foto_perfil"),
  usuarioController.atualizarPerfil,
);
router.post("/conta/excluir", apenasAutenticado, usuarioController.excluirConta);
router.get(
  "/email/confirmar/:token",
  usuarioController.confirmarAlteracaoEmail,
);
router.get("/assinatura", apenasAutenticado, async (req, res) => {
  try {
    const usuario = await usuarioModel.buscarPorId(req.session.usuario.id);
    if (!usuario) return res.status(404).send("Conta não encontrada.");

    const usuarioView = { ...usuario };
    delete usuarioView.senha;
    req.session.usuario.plano = premiumAtivo(usuario) ? "premium" : "free";
    req.session.usuario.premium_ate = usuario.premium_ate;
    req.session.usuario.premium_ativo = usuario.premium_ativo;
    req.session.usuario.assinatura_status = usuario.assinatura_status;
    req.session.usuario.mp_preapproval_id = usuario.mp_preapproval_id;

    const mensagensPagamento = {
      aprovado: "Pagamento aprovado. Seu Premium está ativo por 30 dias.",
      pendente:
        "Pagamento pendente. O Premium será liberado após a confirmação.",
      recusado: "Pagamento não aprovado. Nenhum Premium foi liberado.",
      verificando:
        "Ainda não foi possível confirmar o pagamento. Aguarde a notificação ou tente atualizar a página.",
    };

    return res.render("pages/user/assinatura", {
      usuario: usuarioView,
      erro: req.query.erro === "1",
      mensagemPagamento: mensagensPagamento[req.query.pagamento] || null,
      precoPremium: PRECO_PREMIUM,
      podeReverificarPagamento:
        ["pendente", "verificando"].includes(req.query.pagamento) &&
        /^\d+$/.test(req.session.mercadoPagoPagamentoPendente || ""),
    });
  } catch {
    console.error("Não foi possível carregar os dados da assinatura.");
    return res.status(503).send("Não foi possível carregar sua assinatura.");
  }
});
router.post(
  "/assinatura/assinar",
  apenasAutenticado,
  assinaturaController.criarAssinatura,
);
router.get(
  "/assinatura/retorno",
  apenasAutenticado,
  assinaturaController.retorno,
);
router.post(
  "/assinatura/verificar-pagamento",
  apenasAutenticado,
  assinaturaController.verificarPagamento,
);
router.post(
  "/assinatura/cancelar",
  apenasAutenticado,
  assinaturaController.cancelarAssinatura,
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
router.get(
  "/api/configuracoes/disponibilidade",
  apenasAutenticado,
  usuarioController.verificarDisponibilidade,
);
router.post("/api/premium/relatorio-semanal", async (req, res) => {
  const usuarioSessao = req.session?.usuario;
  if (!usuarioSessao) {
    return res.status(401).json({ erro: "Faça login para continuar." });
  }
  if (!req.is("application/json")) {
    return res.status(415).json({ erro: "Formato de solicitação inválido." });
  }

  try {
    const usuario = await usuarioModel.buscarPorId(usuarioSessao.id);
    if (!usuario?.onboarding_concluido) {
      return res.status(403).json({ erro: "Conclua o onboarding primeiro." });
    }
    if (!premiumAtivo(usuario)) {
      return res.status(403).json({ erro: "Recurso disponível no Premium." });
    }

    const hoje = hojeSaoPaulo();
    const semanaInicio = inicioDaSemana(hoje);
    const relatorioSalvo = await relatorioPremiumModel.buscarSemanal(
      usuario.id,
      semanaInicio,
    );
    if (relatorioSalvo) {
      return res.json({ relatorio: relatorioSalvo, emCache: true });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        erro: "O relatório com IA está temporariamente indisponível.",
      });
    }

    const reserva = await relatorioPremiumModel.reservarSemanal(
      usuario.id,
      semanaInicio,
    );
    if (reserva.estado === "pronto") {
      return res.json({ relatorio: reserva.conteudo, emCache: true });
    }
    if (reserva.estado === "em_andamento") {
      return res.status(409).json({
        erro: "Seu relatório semanal já está sendo preparado. Tente novamente em instantes.",
      });
    }

    try {
      const registros = await tarefaModel.dadosAnalisePremium(
        usuario.id,
        somarDias(semanaInicio, -7),
      );
      const analise = calcularAnalisePremium(registros, hoje);
      const relatorio = await gerarRelatorioSemanal({
        semanaAtual: analise.semanaAtual,
        semanaAnterior: analise.semanaAnterior,
      });
      await relatorioPremiumModel.concluirSemanal(
        usuario.id,
        semanaInicio,
        relatorio,
      );
      return res.json({ relatorio, emCache: false });
    } catch (error) {
      await relatorioPremiumModel.liberarSemanal(usuario.id, semanaInicio);
      throw error;
    }
  } catch (error) {
    console.error("Erro ao gerar relatório semanal Premium:", error);
    return res.status(502).json({
      erro: "Não foi possível gerar o relatório. Tente novamente mais tarde.",
    });
  }
});
router.post(
  "/webauthn/register/options",
  webauthnController.gerarOpcoesCadastro,
);

router.post("/webauthn/register/verify", webauthnController.verificarCadastro);

router.get("/webauthn/status", webauthnController.verificarStatus);

router.delete("/webauthn/remove", webauthnController.removerBiometria);

/* ---------------- Web Push ---------------- */
router.get(
  "/api/push/vapid-public-key",
  apenasAutenticado,
  pushController.chavePublica,
);

router.post("/api/push/inscrever", apenasAutenticado, pushController.inscrever);

router.post(
  "/api/push/desinscrever",
  apenasAutenticado,
  pushController.desinscrever,
);

/* ---------------- Mercado Pago ---------------- */
// Rota chamada pelo Mercado Pago. Protegida pela assinatura HMAC do
// header X-Signature — NÃO usa sessão/autenticação de usuário.
router.post("/webhooks/mercadopago", assinaturaController.webhook);

/* ============================================================
   TESTES
============================================================ */

router.get("/teste", (req, res) => {
  res.json({ ok: true });
});
router.get("/onboarding", apenasAutenticado, async (req, res) => {
  const { usuarioModel } = require("../models/Usuario");
  const usuario = await usuarioModel.buscarPorId(req.session.usuario.id);

  if (usuario?.onboarding_concluido) {
    return res.redirect("/dashboard");
  }

  req.session.usuario.onboarding_concluido = false;
  res.render("pages/user/onboarding");
});

router.post("/onboarding/concluir", apenasAutenticado, async (req, res) => {
  const { usuarioModel } = require("../models/Usuario");
  const { tarefaModel } = require("../models/Tarefa");
  const { gerarTarefasPersonalizadas } = require("../services/iaService");

  const usuarioId = req.session.usuario.id;
  const respostas = req.body || {};

  await usuarioModel.salvarPerfilPesquisa(usuarioId, respostas);

  try {
    const tarefas = await gerarTarefasPersonalizadas(respostas);
    for (const tarefa of tarefas) {
      await tarefaModel.criar({
        usuarioId,
        titulo: tarefa.titulo,
        categoria: tarefa.categoria,
      });
    }
  } catch (err) {
    console.error("Erro ao gerar tarefas personalizadas:", err);
  }

  await usuarioModel.atualizarOnboardingConcluido(usuarioId, true);
  req.session.usuario.onboarding_concluido = true;

  res.json({ ok: true, redirect: "/dashboard" });
});

/* ============================================================
   EXPORTAÇÃO
============================================================ */

module.exports = router;
