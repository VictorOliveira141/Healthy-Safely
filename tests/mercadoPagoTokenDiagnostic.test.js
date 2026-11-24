const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  logMercadoPagoTokenDiagnostic,
} = require("../app/config/mercadoPagoTokenDiagnostic");

test("registra presença, hash SHA-256 e ambiente sem expor o token", () => {
  const token = "token-sigiloso-de-teste";
  const linhas = [];

  logMercadoPagoTokenDiagnostic({
    env: {
      MERCADOPAGO_ACCESS_TOKEN: token,
      MERCADOPAGO_ENV: " test ",
    },
    logger: (linha) => linhas.push(linha),
  });

  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].includes(token), false);
  assert.deepEqual(
    JSON.parse(linhas[0].slice(linhas[0].indexOf("{"))),
    {
      token_loaded: true,
      token_sha256: crypto.createHash("sha256").update(token).digest("hex"),
      environment: "test",
    },
  );
});

test("não registra hash quando o token está ausente", () => {
  const linhas = [];

  logMercadoPagoTokenDiagnostic({
    env: { MERCADOPAGO_ENV: "test" },
    logger: (linha) => linhas.push(linha),
  });

  assert.deepEqual(
    JSON.parse(linhas[0].slice(linhas[0].indexOf("{"))),
    {
      token_loaded: false,
      environment: "test",
    },
  );
});
