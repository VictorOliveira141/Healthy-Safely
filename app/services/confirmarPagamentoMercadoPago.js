const {
  obterDivergenciasPagamento,
  obterDivergenciasPreferencia,
  pedidoPertenceAoUsuario,
} = require("./mercadoPagoService");

async function confirmarPagamentoMercadoPago({
  pagamentoId,
  usuarioId = null,
  testIdentity,
  consultarPagamento,
  consultarPreferencia,
  buscarPedidoPorReferencia,
  registrarPagamento,
}) {
  const id = String(pagamentoId || "");
  if (!/^\d+$/.test(id)) {
    return { tipo: "invalido", motivo: "payment_id_invalido" };
  }
  if (
    !/^\d+$/.test(String(testIdentity?.sellerId || "")) ||
    !/^\d+$/.test(String(testIdentity?.appId || "")) ||
    typeof consultarPreferencia !== "function"
  ) {
    return { tipo: "invalido", motivo: "identidade_teste_nao_configurada" };
  }

  let pagamento;
  try {
    pagamento = await consultarPagamento(id);
  } catch (error) {
    if (Number(error?.status || error?.statusCode) === 404) {
      return { tipo: "nao_encontrado", motivo: "pagamento_nao_encontrado" };
    }
    throw error;
  }

  if (!pagamento) {
    return { tipo: "nao_encontrado", motivo: "pagamento_nao_encontrado" };
  }

  const referencia = pagamento.external_reference;
  if (typeof referencia !== "string" || !referencia) {
    return { tipo: "invalido", motivo: "referencia_externa_ausente" };
  }

  const pedido = await buscarPedidoPorReferencia(referencia);
  if (!pedido) {
    return { tipo: "nao_encontrado", motivo: "pedido_nao_encontrado" };
  }

  if (usuarioId !== null && !pedidoPertenceAoUsuario(pedido, usuarioId)) {
    return { tipo: "nao_autorizado", motivo: "pedido_de_outro_usuario" };
  }

  if (!pedido.preferencia_id) {
    return { tipo: "invalido", motivo: "preferencia_nao_registrada" };
  }

  let preferencia;
  try {
    preferencia = await consultarPreferencia(pedido.preferencia_id);
  } catch (error) {
    if (Number(error?.status || error?.statusCode) === 404) {
      return { tipo: "nao_encontrado", motivo: "preferencia_nao_encontrada" };
    }
    throw error;
  }

  if (!preferencia) {
    return { tipo: "nao_encontrado", motivo: "preferencia_nao_encontrada" };
  }

  const divergenciasPreferencia = obterDivergenciasPreferencia(preferencia, {
    expectedPreferenceId: pedido.preferencia_id,
    expectedExternalReference: pedido.referencia_externa,
    expectedSellerId: testIdentity.sellerId,
    expectedAppId: testIdentity.appId,
  });
  if (divergenciasPreferencia.length > 0) {
    return {
      tipo: "invalido",
      motivo: divergenciasPreferencia.join(","),
    };
  }

  const divergencias = obterDivergenciasPagamento(
    pedido,
    pagamento,
    testIdentity.sellerId,
  );
  if (divergencias.length > 0) {
    return { tipo: "invalido", motivo: divergencias.join(",") };
  }

  const registrado = await registrarPagamento(pedido, pagamento);
  if (!registrado) {
    return { tipo: "conflito", motivo: "pagamento_vinculado_a_outro_pedido" };
  }

  return { tipo: "processado", pagamento };
}

module.exports = { confirmarPagamentoMercadoPago };
