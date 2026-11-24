const test = require("node:test");
const assert = require("node:assert/strict");
const {
  confirmarPagamentoMercadoPago,
} = require("../app/services/confirmarPagamentoMercadoPago");

const pedidoBase = {
  id: 8,
  usuario_id: 42,
  referencia_externa: "referencia-uuid",
  preferencia_id: "preference-123",
  valor: "11.99",
  moeda: "BRL",
};

const pagamentoBase = {
  id: 987654321,
  collector_id: 555,
  external_reference: "referencia-uuid",
  transaction_amount: 11.99,
  currency_id: "BRL",
  live_mode: false,
  status: "approved",
};

const preferenciaBase = {
  id: "preference-123",
  collector_id: 555,
  client_id: "777",
  external_reference: "referencia-uuid",
  sandbox_init_point:
    "https://sandbox.mercadopago.com.br/checkout/v1/redirect/test",
};

const identidadeTeste = { sellerId: "555", appId: "777" };

function criarRepositorio(pagamento = pagamentoBase, pedido = pedidoBase) {
  const gravados = new Map();
  const estado = { concessoesPremium: 0 };
  const pedidoAtual = { ...pedido };

  const repo = {
    estado,
    pagamento,
    preferencia: { ...preferenciaBase },
    consultarPagamento: async () => repo.pagamento,
    consultarPreferencia: async () => repo.preferencia,
    buscarPedidoPorReferencia: async (referencia) =>
      referencia === pedidoAtual.referencia_externa ? pedidoAtual : null,
    registrarPagamento: async (alvo, pagamentoAtual) => {
      const idPagamento = String(pagamentoAtual.id);
      if (!gravados.has(idPagamento)) gravados.set(idPagamento, pagamentoAtual);
      if (
        pagamentoAtual.status === "approved" &&
        !alvo.acesso_concedido_em
      ) {
        alvo.acesso_concedido_em = new Date();
        estado.concessoesPremium += 1;
      }
      return true;
    },
  };
  return repo;
}

function confirmar(repo, pagamentoId = "987654321", usuarioId = 42) {
  return confirmarPagamentoMercadoPago({
    pagamentoId,
    usuarioId,
    testIdentity: identidadeTeste,
    consultarPagamento: repo.consultarPagamento,
    consultarPreferencia: repo.consultarPreferencia,
    buscarPedidoPorReferencia: repo.buscarPedidoPorReferencia,
    registrarPagamento: repo.registrarPagamento,
  });
}

test("confirma pagamento aprovado pela API e grava para o usuário dono do pedido", async () => {
  const repo = criarRepositorio();
  const resultado = await confirmar(repo);

  assert.equal(resultado.tipo, "processado");
  assert.equal(resultado.pagamento.status, "approved");
  assert.equal(repo.estado.concessoesPremium, 1);
});

for (const status of ["pending", "rejected"]) {
  test(`registra pagamento ${status} sem conceder Premium`, async () => {
    const repo = criarRepositorio({ ...pagamentoBase, status });
    const resultado = await confirmar(repo);

    assert.equal(resultado.tipo, "processado");
    assert.equal(resultado.pagamento.status, status);
    assert.equal(repo.estado.concessoesPremium, 0);
  });
}

test("trata pagamento inexistente sem registrar ou conceder acesso", async () => {
  const repo = criarRepositorio();
  repo.consultarPagamento = async () => {
    const error = new Error("not found");
    error.status = 404;
    throw error;
  };

  const resultado = await confirmar(repo);
  assert.deepEqual(resultado, {
    tipo: "nao_encontrado",
    motivo: "pagamento_nao_encontrado",
  });
  assert.equal(repo.estado.concessoesPremium, 0);
});

test("não processa pagamento cujo pedido pertence a outro usuário", async () => {
  const repo = criarRepositorio();
  const resultado = await confirmar(repo, "987654321", 7);

  assert.deepEqual(resultado, {
    tipo: "nao_autorizado",
    motivo: "pedido_de_outro_usuario",
  });
  assert.equal(repo.estado.concessoesPremium, 0);
});

for (const [alteracao, motivo] of [
  [{ transaction_amount: 12 }, "valor"],
  [{ currency_id: "USD" }, "moeda"],
]) {
  test(`rejeita pagamento com ${motivo} divergente`, async () => {
    const repo = criarRepositorio({ ...pagamentoBase, ...alteracao });
    const resultado = await confirmar(repo);

    assert.equal(resultado.tipo, "invalido");
    assert.equal(resultado.motivo, motivo);
    assert.equal(repo.estado.concessoesPremium, 0);
  });
}

test("rejeita confirmação quando o pagamento não está em Sandbox", async () => {
  const repo = criarRepositorio({ ...pagamentoBase, live_mode: true });
  const resultado = await confirmar(repo);

  assert.equal(resultado.tipo, "invalido");
  assert.equal(resultado.motivo, "live_mode_true");
  assert.equal(repo.estado.concessoesPremium, 0);
});

test("rejeita pagamento de outro vendedor de teste", async () => {
  const repo = criarRepositorio({ ...pagamentoBase, collector_id: 999 });
  const resultado = await confirmar(repo);

  assert.equal(resultado.tipo, "invalido");
  assert.equal(resultado.motivo, "vendedor_teste");
  assert.equal(repo.estado.concessoesPremium, 0);
});

test("rejeita preferência de outra aplicação, mesmo com referência coincidente", async () => {
  const repo = criarRepositorio();
  repo.preferencia = { ...preferenciaBase, client_id: "888" };
  const resultado = await confirmar(repo);

  assert.equal(resultado.tipo, "invalido");
  assert.equal(resultado.motivo, "aplicacao_teste");
  assert.equal(repo.estado.concessoesPremium, 0);
});

test("rejeita preferência cujo ID não corresponde ao pedido", async () => {
  const repo = criarRepositorio();
  repo.preferencia = { ...preferenciaBase, id: "preference-456" };
  const resultado = await confirmar(repo);

  assert.equal(resultado.tipo, "invalido");
  assert.equal(resultado.motivo, "preferencia_id");
  assert.equal(repo.estado.concessoesPremium, 0);
});

for (const primeiroEvento of ["retorno", "webhook"]) {
  test(`retorno e webhook em qualquer ordem concedem Premium uma única vez (${primeiroEvento} primeiro)`, async () => {
    const repo = criarRepositorio();
    const segundoEvento = primeiroEvento === "retorno" ? "webhook" : "retorno";
    const processarEvento = (evento) =>
      confirmar(repo, "987654321", evento === "retorno" ? 42 : null);

    const primeiro = await processarEvento(primeiroEvento);
    const segundo = await processarEvento(segundoEvento);

    assert.equal(primeiro.tipo, "processado");
    assert.equal(segundo.tipo, "processado");
    assert.equal(repo.estado.concessoesPremium, 1);
  });
}

test("pedido pendente pode ser consultado novamente quando o pagamento aprova", async () => {
  const repo = criarRepositorio({ ...pagamentoBase, status: "pending" });
  const inicial = await confirmar(repo);
  repo.pagamento = { ...pagamentoBase, status: "approved" };
  const atualizado = await confirmar(repo);

  assert.equal(inicial.pagamento.status, "pending");
  assert.equal(atualizado.pagamento.status, "approved");
  assert.equal(repo.estado.concessoesPremium, 1);
});

test("consulta falha é propagada sem conceder Premium", async () => {
  const repo = criarRepositorio();
  repo.consultarPagamento = async () => {
    const error = new Error("API indisponível");
    error.status = 503;
    throw error;
  };

  await assert.rejects(confirmar(repo), { status: 503 });
  assert.equal(repo.estado.concessoesPremium, 0);
});
