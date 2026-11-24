const crypto = require("crypto");

function verificarAssinaturaWebhook(req, segredo) {
  if (!segredo) return false;

  const assinatura = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const dataId = req.query?.["data.id"] || req.body?.data?.id;
  if (
    typeof assinatura !== "string" ||
    typeof requestId !== "string" ||
    typeof dataId !== "string" ||
    !/^\d+$/.test(dataId)
  ) {
    return false;
  }

  const campos = {};
  for (const parte of assinatura.split(",")) {
    const separador = parte.indexOf("=");
    if (separador < 0) continue;
    campos[parte.slice(0, separador).trim()] = parte
      .slice(separador + 1)
      .trim();
  }

  if (!campos.ts || !/^[a-f\d]{64}$/i.test(campos.v1 || "")) return false;

  const manifesto = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${campos.ts};`;
  const hashEsperado = crypto
    .createHmac("sha256", segredo)
    .update(manifesto)
    .digest();
  const hashRecebido = Buffer.from(campos.v1, "hex");

  return (
    hashEsperado.length === hashRecebido.length &&
    crypto.timingSafeEqual(hashEsperado, hashRecebido)
  );
}

function pagamentoCorrespondeAoPedido(pedido, pagamento) {
  return (
    typeof pedido?.preferencia_id === "string" &&
    pedido.preferencia_id.length > 0 &&
    String(pagamento?.external_reference || "") ===
      String(pedido?.referencia_externa || "") &&
    Math.round(Number(pagamento?.transaction_amount) * 100) ===
      Math.round(Number(pedido?.valor) * 100) &&
    pagamento?.currency_id === pedido?.moeda &&
    pagamento?.live_mode === false &&
    typeof pagamento?.status === "string" &&
    typeof pagamento?.id !== "undefined" &&
    /^\d+$/.test(String(pagamento.id))
  );
}

function pagamentoAprovado(status) {
  return status === "approved";
}

function pedidoPertenceAoUsuario(pedido, usuarioId) {
  return (
    pedido?.usuario_id !== null &&
    typeof pedido?.usuario_id !== "undefined" &&
    usuarioId !== null &&
    typeof usuarioId !== "undefined" &&
    Number(pedido.usuario_id) === Number(usuarioId)
  );
}

module.exports = {
  pagamentoAprovado,
  pagamentoCorrespondeAoPedido,
  pedidoPertenceAoUsuario,
  verificarAssinaturaWebhook,
};
