const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2");

const poolPath = require.resolve("../app/config/pool_conexoes");
const usuarioPath = require.resolve("../app/models/Usuario");
const promisePool = {};
const originalCreatePool = mysql.createPool;
const originalLog = console.log;
const originalError = console.error;

mysql.createPool = () => ({
  getConnection: (callback) => callback(null, { release: () => {} }),
  promise: () => promisePool,
});
console.log = () => {};
console.error = () => {};
delete require.cache[poolPath];
delete require.cache[usuarioPath];
const pool = require(poolPath);
const { usuarioModel } = require(usuarioPath);
mysql.createPool = originalCreatePool;
console.log = originalLog;
console.error = originalError;

const { demoPremiumAuthorized } = require("../app/config/demoPremium");
const assinaturaController = require("../app/controllers/assinaturaController");

const nomesVariaveis = ["DEMO_PREMIUM_ENABLED", "DEMO_PREMIUM_USER_ID"];
const valoresOriginais = Object.fromEntries(
  nomesVariaveis.map((nome) => [nome, process.env[nome]]),
);

test.after(() => {
  for (const [nome, valor] of Object.entries(valoresOriginais)) {
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }
});

test("modo demo exige habilitação explícita e corresponde ao ID configurado", () => {
  process.env.DEMO_PREMIUM_ENABLED = "true";
  process.env.DEMO_PREMIUM_USER_ID = "42";
  assert.equal(demoPremiumAuthorized(42), true);
  assert.equal(demoPremiumAuthorized("7"), false);

  process.env.DEMO_PREMIUM_ENABLED = "false";
  assert.equal(demoPremiumAuthorized(42), false);

  process.env.DEMO_PREMIUM_ENABLED = "true";
  process.env.DEMO_PREMIUM_USER_ID = "invalid";
  assert.equal(demoPremiumAuthorized(42), false);
});

test("ativação concede 30 dias apenas quando não há Premium ativo", async () => {
  const chamadas = [];
  pool.query = async (sql, params) => {
    chamadas.push({ sql, params });
    return [{ affectedRows: 1 }, []];
  };

  assert.equal(await usuarioModel.ativarPremiumDemonstracao(42), "ativado");
  assert.equal(chamadas.length, 1);
  assert.match(chamadas[0].sql, /INTERVAL 30 DAY/);
  assert.match(chamadas[0].sql, /assinatura_atualizada_em = UTC_TIMESTAMP\(\)/);
  assert.match(chamadas[0].sql, /premium_ate <= UTC_TIMESTAMP\(\)/);
  assert.deepEqual(chamadas[0].params, [42]);
});

test("ativação repetida não estende um Premium que já está ativo", async () => {
  let consultas = 0;
  pool.query = async (sql) => {
    consultas += 1;
    if (sql.startsWith("UPDATE usuarios")) return [{ affectedRows: 0 }, []];
    return [[{ premium_ativo: 1 }], []];
  };

  assert.equal(await usuarioModel.ativarPremiumDemonstracao(42), "ja_ativo");
  assert.equal(consultas, 2);
});

test("assinante autorizado vê confirmação sem iniciar checkout", async () => {
  process.env.DEMO_PREMIUM_ENABLED = "true";
  process.env.DEMO_PREMIUM_USER_ID = "42";
  const resposta = { redirect: (url) => url };

  assert.equal(
    await assinaturaController.criarAssinatura(
      { session: { usuario: { id: 42 } } },
      resposta,
    ),
    "/assinatura?demo=confirmar",
  );
});

test("endpoint de confirmação autoriza só a conta configurada e atualiza sessão", async () => {
  process.env.DEMO_PREMIUM_ENABLED = "true";
  process.env.DEMO_PREMIUM_USER_ID = "42";

  const buscarOriginal = usuarioModel.buscarPorId;
  const ativarOriginal = usuarioModel.ativarPremiumDemonstracao;
  let usuarioAtivado;
  usuarioModel.buscarPorId = async (id) => ({
    id,
    plano: "premium",
    premium_ativo: 1,
    senha: "remover",
  });
  usuarioModel.ativarPremiumDemonstracao = async (id) => {
    usuarioAtivado = id;
    return "ativado";
  };

  try {
    const req = { session: { usuario: { id: 42 } } };
    const resposta = { redirect: (url) => url };
    assert.equal(
      await assinaturaController.confirmarAtivacaoDemonstracao(req, resposta),
      "/assinatura",
    );
    assert.equal(usuarioAtivado, 42);
    assert.equal(req.session.demoPremiumNotice, "ativado");
    assert.equal(req.session.usuario.premium_ativo, 1);
    assert.equal("senha" in req.session.usuario, false);

    let status;
    const naoAutorizado = await assinaturaController.confirmarAtivacaoDemonstracao(
      { session: { usuario: { id: 7 } } },
      { sendStatus: (codigo) => (status = codigo) },
    );
    assert.equal(naoAutorizado, 403);
    assert.equal(status, 403);
    assert.equal(usuarioAtivado, 42);
  } finally {
    usuarioModel.buscarPorId = buscarOriginal;
    usuarioModel.ativarPremiumDemonstracao = ativarOriginal;
  }
});
