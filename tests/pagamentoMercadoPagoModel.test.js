const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2");

const poolPath = require.resolve("../app/config/pool_conexoes");
const modelPath = require.resolve("../app/models/PagamentoMercadoPago");
const promisePool = {};
const originalCreatePool = mysql.createPool;
const originalLog = console.log;
mysql.createPool = () => ({
  getConnection: (callback) => callback(null, { release: () => {} }),
  promise: () => promisePool,
});
console.log = () => {};
delete require.cache[poolPath];
const pool = require(poolPath);
const { pagamentoMercadoPagoModel } = require(modelPath);
mysql.createPool = originalCreatePool;
console.log = originalLog;

test("registrarPagamento é idempotente e rejeita conflito de pedido", async () => {
  const originalGetConnection = pool.getConnection;
  const estado = {
    pedido: {
      id: 8,
      usuario_id: 42,
      estado: "pending",
      acesso_concedido_em: null,
    },
    pagamentos: new Map(),
    usuario: { premium_ate: null },
    atualizacoesPremium: 0,
    commits: 0,
    rollbacks: 0,
    forcarConflito: false,
  };

  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {
      estado.commits += 1;
    },
    rollback: async () => {
      estado.rollbacks += 1;
    },
    release: () => {},
    query: async (sql, params) => {
      if (sql.includes("SELECT id, usuario_id, estado, acesso_concedido_em")) {
        return [[{ ...estado.pedido }], []];
      }
      if (sql.includes("SELECT pedido_id FROM mp_pagamentos")) {
        const pagamento = estado.pagamentos.get(String(params[0]));
        return [pagamento ? [{ pedido_id: pagamento.pedido_id }] : [], []];
      }
      if (sql.includes("INSERT INTO mp_pagamentos")) {
        estado.pagamentos.set(String(params[1]), {
          pedido_id: estado.forcarConflito ? 999 : params[0],
          status: params[2],
        });
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("UPDATE usuarios") && sql.includes("SET premium_ate")) {
        estado.atualizacoesPremium += 1;
        estado.usuario.premium_ate = new Date("2030-01-31T00:00:00.000Z");
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("SELECT premium_ate FROM usuarios")) {
        return [[{ premium_ate: estado.usuario.premium_ate }], []];
      }
      if (sql.includes("UPDATE mp_pedidos")) {
        estado.pedido.estado = "approved";
        estado.pedido.acesso_concedido_em = new Date();
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`Consulta SQL não esperada no teste: ${sql}`);
    },
  });

  try {
    const pedido = { id: 8, usuario_id: 42 };
    const pagamento = {
      id: 987654321,
      status: "approved",
      transaction_amount: 11.99,
      currency_id: "BRL",
      live_mode: false,
    };

    assert.equal(
      await pagamentoMercadoPagoModel.registrarPagamento(pedido, pagamento),
      true,
    );
    assert.equal(
      await pagamentoMercadoPagoModel.registrarPagamento(pedido, pagamento),
      true,
    );
    assert.equal(estado.atualizacoesPremium, 1);
    assert.equal(estado.pagamentos.size, 1);
    assert.equal(estado.commits, 2);

    estado.pagamentos.clear();
    estado.pedido.acesso_concedido_em = null;
    estado.forcarConflito = true;
    assert.equal(
      await pagamentoMercadoPagoModel.registrarPagamento(pedido, pagamento),
      false,
    );
    assert.equal(estado.atualizacoesPremium, 1);
    assert.equal(estado.commits, 2);
    assert.equal(estado.rollbacks, 1);
  } finally {
    pool.getConnection = originalGetConnection;
  }
});
