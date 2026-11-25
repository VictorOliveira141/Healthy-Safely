const { MercadoPagoConfig } = require("mercadopago");

// Integração habilitada SOMENTE em teste. Se MERCADOPAGO_ENV não estiver
// definido, assume "test"; qualquer outro valor bloqueia o SDK.
function assertTestEnvironment() {
  const ambiente = (process.env.MERCADOPAGO_ENV || "test").trim().toLowerCase();
  if (ambiente !== "test") {
    const error = new Error("Mercado Pago está habilitado somente em TESTE.");
    error.code = "MP_TEST_ENVIRONMENT_REQUIRED";
    throw error;
  }
}

function getAccessToken() {
  assertTestEnvironment();

  const accessToken = (
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    ""
  )
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!accessToken) {
    const error = new Error("Access Token do Mercado Pago não configurado.");
    error.code = "MP_TEST_CONFIGURATION";
    throw error;
  }

  return accessToken;
}

// Tokens do Mercado Pago têm o formato
// APP_USR-<app_id>-<data>-<hash>-<user_id> (ou TEST-...). Quando os IDs não
// estão no .env, são extraídos do próprio token.
function idsDoToken(token) {
  const partes = String(token || "").split("-");
  if (partes.length < 5) return {};
  const appId = partes[1];
  const sellerId = partes[partes.length - 1];
  return {
    appId: /^\d+$/.test(appId) ? appId : undefined,
    sellerId: /^\d+$/.test(sellerId) ? sellerId : undefined,
  };
}

function getTestMercadoPagoIdentity() {
  assertTestEnvironment();

  const doToken = idsDoToken(
    process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN,
  );
  const sellerId = (
    process.env.MERCADOPAGO_TEST_SELLER_ID ||
    doToken.sellerId ||
    ""
  ).trim();
  const appId = (
    process.env.MERCADOPAGO_TEST_APP_ID ||
    doToken.appId ||
    ""
  ).trim();
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
  // Sem a opção testToken: o cabeçalho X-Test-Token é dos tokens TEST-
  // antigos e faz a busca de pagamentos de contas de teste voltar vazia. A
  // proteção contra dinheiro real é assertContaDeTeste().
  return new MercadoPagoConfig({ accessToken: getAccessToken() });
}

// Garante que o token pertence a uma CONTA DE TESTE do Mercado Pago
// (tag "test_user"), para que nenhum dinheiro real seja movimentado.
// O resultado é guardado em cache por token.
const cacheContaTeste = new Map();
async function assertContaDeTeste(fetchImpl = globalThis.fetch) {
  const token = getAccessToken();
  if (cacheContaTeste.get(token) === true) return;

  const resposta = await fetchImpl("https://api.mercadopago.com/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resposta.ok) {
    const error = new Error("Não foi possível validar a conta do Mercado Pago.");
    error.code = "MP_ACCOUNT_CHECK_FAILED";
    error.status = resposta.status;
    throw error;
  }

  const conta = await resposta.json();
  if (!Array.isArray(conta?.tags) || !conta.tags.includes("test_user")) {
    const error = new Error(
      "O Access Token não é de uma conta de teste do Mercado Pago.",
    );
    error.code = "MP_NOT_TEST_ACCOUNT";
    throw error;
  }

  cacheContaTeste.set(token, true);
}

module.exports = {
  assertContaDeTeste,
  assertTestEnvironment,
  createMercadoPagoClient,
  getAccessToken,
  getTestMercadoPagoIdentity,
  getWebhookSecret,
  idsDoToken,
};
