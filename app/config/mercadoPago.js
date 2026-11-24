const { MercadoPagoConfig } = require("mercadopago");

function assertTestEnvironment() {
  if ((process.env.MERCADOPAGO_ENV || "").trim().toLowerCase() !== "test") {
    const error = new Error("Mercado Pago está habilitado somente em TESTE.");
    error.code = "MP_TEST_ENVIRONMENT_REQUIRED";
    throw error;
  }
}

function getAccessToken() {
  assertTestEnvironment();

  const accessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();
  if (!accessToken) {
    const error = new Error("Access Token do Mercado Pago não configurado.");
    error.code = "MP_TEST_CONFIGURATION";
    throw error;
  }

  return accessToken;
}

function getTestMercadoPagoIdentity() {
  assertTestEnvironment();

  const sellerId = (process.env.MERCADOPAGO_TEST_SELLER_ID || "").trim();
  const appId = (process.env.MERCADOPAGO_TEST_APP_ID || "").trim();
  if (!/^\d+$/.test(sellerId) || !/^\d+$/.test(appId)) {
    const error = new Error(
      "Identidade do vendedor e da aplicação de teste não configurada.",
    );
    error.code = "MP_TEST_IDENTITY_CONFIGURATION";
    throw error;
  }

  return { sellerId, appId };
}

function getWebhookSecret() {
  return (
    process.env.MERCADOPAGO_WEBHOOK_SECRET ||
    process.env.MP_WEBHOOK_SECRET ||
    ""
  ).trim();
}

function createMercadoPagoClient() {
  return new MercadoPagoConfig({
    accessToken: getAccessToken(),
    options: { testToken: true },
  });
}

module.exports = {
  assertTestEnvironment,
  createMercadoPagoClient,
  getAccessToken,
  getTestMercadoPagoIdentity,
  getWebhookSecret,
};
