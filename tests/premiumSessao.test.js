const test = require("node:test");
const assert = require("node:assert/strict");
const { premiumAtivoNaSessao } = require("../app/utils/premium");

const agora = new Date("2026-11-25T12:00:00Z");

test("Premium na sessão respeita a data de expiração", () => {
  assert.equal(
    premiumAtivoNaSessao(
      { plano: "premium", premium_ate: "2026-12-25T12:00:00.000Z" },
      agora,
    ),
    true,
  );
  assert.equal(
    premiumAtivoNaSessao(
      { plano: "premium", premium_ate: "2026-11-01T12:00:00.000Z", premium_ativo: 1 },
      agora,
    ),
    false,
  );
  assert.equal(
    premiumAtivoNaSessao({ plano: "free", premium_ate: "2026-12-25" }, agora),
    false,
  );
  assert.equal(premiumAtivoNaSessao(null, agora), false);
});
