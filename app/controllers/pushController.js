const { pushSubscriptionModel } = require("../models/PushSubscription");
const {
  verificarEEnviarNotificacoes,
} = require("../services/notificacaoPushService");

const pushController = {
  // Fornece a chave pública VAPID ao frontend (a privada nunca sai do backend)
  chavePublica: (req, res) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
      return res
        .status(503)
        .json({ ok: false, erro: "Notificações push não configuradas." });
    }
    res.json({ ok: true, publicKey: process.env.VAPID_PUBLIC_KEY });
  },

  // Associa uma subscription ao usuário autenticado
  inscrever: async (req, res) => {
    try {
      const usuarioId = req.session?.usuario?.id;
      if (!usuarioId) {
        return res.status(401).json({ ok: false, erro: "Não autenticado." });
      }

      const subscription = req.body?.subscription;
      if (
        !subscription?.endpoint ||
        !subscription?.keys?.p256dh ||
        !subscription?.keys?.auth
      ) {
        return res
          .status(400)
          .json({ ok: false, erro: "Subscription inválida." });
      }

      const salvo = await pushSubscriptionModel.salvar(usuarioId, {
        ...subscription,
        userAgent: (req.headers["user-agent"] || "").slice(0, 255),
      });

      if (!salvo) {
        return res
          .status(500)
          .json({ ok: false, erro: "Erro ao salvar subscription." });
      }

      res.json({ ok: true });
    } catch (e) {
      console.error("Erro ao inscrever push:", e);
      res.status(500).json({ ok: false, erro: "Erro interno." });
    }
  },

  // Remove a subscription do usuário autenticado
  desinscrever: async (req, res) => {
    try {
      const usuarioId = req.session?.usuario?.id;
      if (!usuarioId) {
        return res.status(401).json({ ok: false, erro: "Não autenticado." });
      }

      const endpoint = req.body?.endpoint;
      if (!endpoint) {
        return res.status(400).json({ ok: false, erro: "Endpoint obrigatório." });
      }

      await pushSubscriptionModel.remover(usuarioId, endpoint);
      res.json({ ok: true });
    } catch (e) {
      console.error("Erro ao desinscrever push:", e);
      res.status(500).json({ ok: false, erro: "Erro interno." });
    }
  },

  // Ponto de entrada HTTP para o cron externo (ex.: cron-job.org).
  // Não usa sessão/autenticação de usuário — apenas o segredo do header.
  executarCron: async (req, res) => {
    const segredoEsperado = process.env.CRON_SECRET;

    if (!segredoEsperado) {
      console.error("CRON_SECRET não configurado no .env — rota de cron bloqueada.");
      return res.status(503).json({ ok: false, erro: "Cron não configurado." });
    }

    const segredoRecebido = req.headers["x-cron-secret"];

    if (!segredoRecebido || segredoRecebido !== segredoEsperado) {
      return res.status(401).json({ ok: false, erro: "Não autorizado." });
    }

    try {
      const resultado = await verificarEEnviarNotificacoes();
      res.status(200).json({ ok: true, ...resultado });
    } catch (e) {
      console.error("Erro ao executar verificação de push via cron externo:", e);
      res.status(500).json({ ok: false, erro: "Erro interno ao verificar tarefas." });
    }
  },
};

module.exports = pushController;