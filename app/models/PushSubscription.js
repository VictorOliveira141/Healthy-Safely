var pool = require("../../app/config/pool_conexoes");

const pushSubscriptionModel = {
  // Salva ou atualiza a subscription do dispositivo atual.
  // O usuarioId SEMPRE vem da sessão autenticada (nunca do body do request).
  salvar: async (usuarioId, subscription) => {
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (!endpoint || !p256dh || !auth) return null;

    try {
      await pool.query(
        `INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth, user_agent)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           usuario_id = VALUES(usuario_id),
           p256dh     = VALUES(p256dh),
           auth       = VALUES(auth),
           user_agent = VALUES(user_agent)`,
        [usuarioId, endpoint, p256dh, auth, subscription.userAgent || null],
      );
      return true;
    } catch (e) {
      console.error("Erro ao salvar push subscription:", e);
      return null;
    }
  },

  // Remove a subscription de um usuário específico (usado ao desativar o toggle)
  remover: async (usuarioId, endpoint) => {
    try {
      await pool.query(
        "DELETE FROM push_subscriptions WHERE usuario_id = ? AND endpoint = ?",
        [usuarioId, endpoint],
      );
      return true;
    } catch (e) {
      return false;
    }
  },

  // Remove por endpoint (usado quando o provedor retorna 404/410 = subscription expirada)
  removerPorEndpoint: async (endpoint) => {
    try {
      await pool.query("DELETE FROM push_subscriptions WHERE endpoint = ?", [
        endpoint,
      ]);
      return true;
    } catch (e) {
      return false;
    }
  },

  listarPorUsuario: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM push_subscriptions WHERE usuario_id = ?",
        [usuarioId],
      );
      return linhas;
    } catch (e) {
      return [];
    }
  },
};

module.exports = { pushSubscriptionModel };