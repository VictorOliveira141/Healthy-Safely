const { MercadoPagoConfig } = require("mercadopago");

if (!process.env.MP_ACCESS_TOKEN) {
  console.warn(
    "⚠️  MP_ACCESS_TOKEN não definido no .env — a assinatura Premium não vai funcionar.",
  );
}

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || "",
});

module.exports = mpClient;
