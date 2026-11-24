const {
  obterDivergenciasPagamento,
  pedidoPertenceAoUsuario,
} = require("./mercadoPagoService");

async function confirmarPagamentoMercadoPago({
  pagamentoId,
  usuarioId = null,
  consultarPagamento,
  buscarPedidoPorReferencia,
  registrarPagamento,
}) {
  const id = String(pagamentoId || "");
  if (!/^\d+$/.test(id)) {
    return { tipo: "invalido", motivo: "payment_id_invalido" };
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

  const divergencias = obterDivergenciasPagamento(pedido, pagamento);
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
