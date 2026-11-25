const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  assertContaDeTeste,
  assertTestEnvironment,
  createMercadoPagoClient,
  getAccessToken,
  getTestMercadoPagoIdentity,
} = require("../app/config/mercadoPago");
const {
  pagamentoAprovado,
  pagamentoCorrespondeAoPedido,
  obterDivergenciasPagamento,
  obterDivergenciasPreferencia,
  pedidoPertenceAoUsuario,
  verificarAssinaturaWebhook,
} = require("../app/services/mercadoPagoService");

const nomesVariaveis = [
  "MERCADOPAGO_ENV",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_TEST_SELLER_ID",
  "MERCADOPAGO_TEST_APP_ID",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "MP_ACCESS_TOKEN",
  "MP_ACCESS_TOKEN",
  "MP_WEBHOOK_SECRET",
];
const variaveisOriginais = Object.fromEntries(
  nomesVariaveis.map((nome) => [nome, process.env[nome]]),
);

test.after(() => {
  for (const [nome, valor] of Object.entries(variaveisOriginais)) {
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }
});

test("exige ambiente explicitamente Sandbox e sinaliza teste ao SDK", () => {
  process.env.MERCADOPAGO_ENV = "production";
  process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-token-de-teste";
  assert.throws(() => getAccessToken(), {
    code: "MP_TEST_ENVIRONMENT_REQUIRED",
  });

  process.env.MERCADOPAGO_ENV = "test";
  assert.equal(getAccessToken(), "APP_USR-token-de-teste");
  assert.equal(assertTestEnvironment(), undefined);
  assert.equal(createMercadoPagoClient().accessToken, "APP_USR-token-de-teste");
});

test("aceita MP_ACCESS_TOKEN do .env e não inicia sem credenciais", () => {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  process.env.MP_ACCESS_TOKEN = "APP_USR-123-456-abc-789";
  process.env.MERCADOPAGO_ENV = "test";
  assert.equal(getAccessToken(), "APP_USR-123-456-abc-789");

  delete process.env.MP_ACCESS_TOKEN;
  assert.throws(() => getAccessToken(), { code: "MP_TEST_CONFIGURATION" });
});

test("extrai vendedor e aplicação do token quando não estão no .env", () => {
  delete process.env.MERCADOPAGO_TEST_SELLER_ID;
  delete process.env.MERCADOPAGO_TEST_APP_ID;
  process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-111222-112526-abcdef-333444";
  assert.deepEqual(getTestMercadoPagoIdentity(), {
    sellerId: "333444",
    appId: "111222",
  });
});

test("bloqueia token que não é de conta de teste", async () => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-1-2-conta-real-3";
  const fetchFalso = async () => ({
    ok: true,
    json: async () => ({ tags: ["normal"] }),
  });
  await assert.rejects(assertContaDeTeste(fetchFalso), {
    code: "MP_NOT_TEST_ACCOUNT",
  });

  const fetchTeste = async () => ({
    ok: true,
    json: async () => ({ tags: ["test_user", "normal"] }),
  });
  await assertContaDeTeste(fetchTeste);
});

test("exige a identidade esperada do vendedor e da aplicação de teste", () => {
  process.env.MERCADOPAGO_ENV = "test";
  process.env.MERCADOPAGO_TEST_SELLER_ID = "123456789";
  process.env.MERCADOPAGO_TEST_APP_ID = "987654321";
  assert.deepEqual(getTestMercadoPagoIdentity(), {
    sellerId: "123456789",
    appId: "987654321",
  });

  process.env.MERCADOPAGO_TEST_SELLER_ID = "vendedor-invalido";
  assert.throws(() => getTestMercadoPagoIdentity(), {
    code: "MP_TEST_IDENTITY_CONFIGURATION",
  });
});

test("valida HMAC do webhook e rejeita alteração de id, cabeçalho ou segredo", () => {
  const segredo = "segredo-de-teste";
  const requestId = "request-123";
  const timestamp = "1700000000";
  const dataId = "987654321";
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const signature = crypto
    .createHmac("sha256", segredo)
    .update(manifest)
    .digest("hex");
  const req = {
    headers: {
      "x-request-id": requestId,
      "x-signature": `ts=${timestamp},v1=${signature}`,
    },
    query: { "data.id": dataId },
    body: {},
  };

  assert.equal(verificarAssinaturaWebhook(req, segredo), true);
  assert.equal(verificarAssinaturaWebhook(req, ""), false);
  assert.equal(
    verificarAssinaturaWebhook(
      { ...req, query: { "data.id": "987654322" } },
      segredo,
    ),
    false,
  );
  assert.equal(
    verificarAssinaturaWebhook(
      { ...req, headers: { ...req.headers, "x-request-id": "outro" } },
      segredo,
    ),
    false,
  );
});

test("confirma somente pagamentos Sandbox vinculados ao pedido e ao valor fixo", () => {
  const pedido = {
    referencia_externa: "referencia-uuid",
    preferencia_id: "preference-123",
    valor: "11.99",
    moeda: "BRL",
  };
  const pagamento = {
    id: 12345,
    external_reference: "referencia-uuid",
    transaction_amount: 11.99,
    currency_id: "BRL",
    live_mode: false,
    status: "approved",
  };

  assert.equal(pedidoPertenceAoUsuario({ usuario_id: 42 }, "42"), true);
  assert.equal(pedidoPertenceAoUsuario({ usuario_id: 42 }, 7), false);
  assert.equal(pagamentoCorrespondeAoPedido(pedido, pagamento), true);
  assert.deepEqual(obterDivergenciasPagamento(pedido, pagamento), []);
  const preferencia = {
    id: "preference-123",
    external_reference: "referencia-uuid",
    collector_id: 555,
    client_id: "777",
    sandbox_init_point:
      "https://sandbox.mercadopago.com.br/checkout/v1/redirect/test",
  };
  assert.deepEqual(
    obterDivergenciasPreferencia(preferencia, {
      expectedExternalReference: "referencia-uuid",
      expectedSellerId: "555",
      expectedAppId: "777",
    }),
    [],
  );
  assert.deepEqual(
    obterDivergenciasPreferencia(
      { ...preferencia, client_id: "888" },
      {
        expectedExternalReference: "referencia-uuid",
        expectedSellerId: "555",
        expectedAppId: "777",
      },
    ),
    ["aplicacao_teste"],
  );
  assert.equal(pagamentoAprovado("approved"), true);
  assert.equal(pagamentoAprovado("pending"), false);
  assert.equal(pagamentoAprovado("in_process"), false);
  assert.equal(pagamentoAprovado("rejected"), false);
  assert.equal(
    pagamentoCorrespondeAoPedido(pedido, {
      ...pagamento,
      external_reference: "outra-conta",
    }),
    false,
  );
  assert.equal(
    pagamentoCorrespondeAoPedido(pedido, {
      ...pagamento,
      transaction_amount: 1,
    }),
    false,
  );
  assert.equal(
    pagamentoCorrespondeAoPedido(pedido, {
      ...pagamento,
      external_reference: "outra-referencia",
    }),
    false,
  );
  assert.equal(
    pagamentoCorrespondeAoPedido(
      { ...pedido, preferencia_id: null },
      pagamento,
    ),
    false,
  );
  assert.deepEqual(
    obterDivergenciasPagamento(
      { ...pedido, preferencia_id: null },
      pagamento,
    ),
    ["preferencia_nao_registrada"],
  );
});
