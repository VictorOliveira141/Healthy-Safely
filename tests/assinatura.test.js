const test = require("node:test");
const assert = require("node:assert/strict");
const { emailPagador } = require("../app/config/mercadoPagoAssinatura");

const variaveisOriginais = {
  MP_TEST_MODE: process.env.MP_TEST_MODE,
  MP_ENV: process.env.MP_ENV,
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
  MP_TEST_PAYER_EMAIL: process.env.MP_TEST_PAYER_EMAIL,
};

test.after(() => {
  for (const [chave, valor] of Object.entries(variaveisOriginais)) {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  }
});

test("MP_TEST_MODE usa o comprador de teste configurado", () => {
  process.env.MP_TEST_MODE = "true";
  delete process.env.MP_ENV;
  process.env.MP_ACCESS_TOKEN = "TEST-token-de-exemplo";
  process.env.MP_TEST_PAYER_EMAIL = "comprador@testuser.com";

  assert.equal(
    emailPagador({ email: "conta-pessoal@example.com" }),
    "comprador@testuser.com",
  );
});

test("modo normal continua usando o e-mail da conta", () => {
  process.env.MP_TEST_MODE = "false";
  delete process.env.MP_ENV;
  process.env.MP_ACCESS_TOKEN = "APP_USR-token-de-exemplo";
  process.env.MP_TEST_PAYER_EMAIL = "";

  assert.equal(
    emailPagador({ email: "conta-pessoal@example.com" }),
    "conta-pessoal@example.com",
  );
});

test("sandbox recusa credenciais que poderiam cobrar uma conta real", () => {
  process.env.MP_TEST_MODE = "true";
  delete process.env.MP_ENV;
  process.env.MP_ACCESS_TOKEN = "APP_USR-token-de-exemplo";
  process.env.MP_TEST_PAYER_EMAIL = "comprador@testuser.com";

  assert.throws(
    () => emailPagador({ email: "conta-pessoal@example.com" }),
    { code: "MP_TEST_CONFIGURATION" },
  );
});

test("MP_ENV=test também ativa sandbox e valida o token", () => {
  process.env.MP_TEST_MODE = "false";
  process.env.MP_ENV = "test";
  process.env.MP_ACCESS_TOKEN = "TEST-token-de-exemplo";
  process.env.MP_TEST_PAYER_EMAIL = "comprador@testuser.com";

  assert.equal(
    emailPagador({ email: "conta-pessoal@example.com" }),
    "comprador@testuser.com",
  );

  process.env.MP_ACCESS_TOKEN = "APP_USR-token-de-exemplo";
  assert.throws(
    () => emailPagador({ email: "conta-pessoal@example.com" }),
    { code: "MP_TEST_CONFIGURATION" },
  );
});
