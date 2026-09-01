// ============================================================
// app/config/webpush.js
// Configura a lib "web-push" com as chaves VAPID do .env.
// Nunca exponha VAPID_PRIVATE_KEY no frontend — apenas
// VAPID_PUBLIC_KEY pode ser enviada ao navegador.
// ============================================================
const webpush = require("web-push");

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:contato@healthysafely.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
} else {
  console.warn(
    "⚠️  VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas no .env — notificações push desativadas.",
  );
}

module.exports = webpush;