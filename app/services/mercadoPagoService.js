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

// Contas de teste com token APP_USR usam o init_point normal (o comprador de
// teste faz login nele); tokens TEST- usam o sandbox_init_point.
const HOSTS_CHECKOUT = ["www.mercadopago.com.br", "sandbox.mercadopago.com.br"];
function urlCheckout(preferencia) {
  for (const candidata of [
    preferencia?.init_point,
    preferencia?.sandbox_init_point,
  ]) {
    try {
      const url = new URL(candidata || "");
      if (url.protocol === "https:" && HOSTS_CHECKOUT.includes(url.hostname)) {
        return url.toString();
      }
    } catch {
      // tenta a próxima
    }
  }
  return null;
}

function obterDivergenciasPreferencia(
  preferencia,
  {
    expectedPreferenceId,
    expectedExternalReference,
    expectedSellerId,
    expectedAppId,
  },
) {
  const divergencias = [];
  const preferenceId = String(preferencia?.id || "");

  if (!preferenceId) divergencias.push("preferencia_id_ausente");
  if (
    expectedPreferenceId &&
    preferenceId !== String(expectedPreferenceId)
  ) {
    divergencias.push("preferencia_id");
  }
  if (
    typeof expectedExternalReference !== "string" ||
    preferencia?.external_reference !== expectedExternalReference
  ) {
    divergencias.push("referencia_externa");
  }
  if (
    !expectedSellerId ||
    String(preferencia?.collector_id || "") !== String(expectedSellerId)
  ) {
    divergencias.push("vendedor_teste");
  }
  if (
    !expectedAppId ||
    String(preferencia?.client_id || "") !== String(expectedAppId)
  ) {
    divergencias.push("aplicacao_teste");
  }

  if (!urlCheckout(preferencia)) {
    divergencias.push("checkout_url_invalida");
  }

  return divergencias;
}

function obterDivergenciasPagamento(pedido, pagamento, expectedSellerId) {
  const divergencias = [];
  const referenciaPedido = String(pedido?.referencia_externa || "");
  const referenciaPagamento = String(pagamento?.external_reference || "");
  const valorPedido = Number(pedido?.valor);
  const valorPagamento = Number(pagamento?.transaction_amount);

  if (
    typeof pedido?.preferencia_id !== "string" ||
    pedido.preferencia_id.length === 0
  ) {
    divergencias.push("preferencia_nao_registrada");
  }
  if (!referenciaPedido || !referenciaPagamento) {
    divergencias.push("referencia_externa_ausente");
  } else if (referenciaPagamento !== referenciaPedido) {
    divergencias.push("referencia_externa");
  }
  if (
    !Number.isFinite(valorPedido) ||
    !Number.isFinite(valorPagamento) ||
    Math.round(valorPagamento * 100) !== Math.round(valorPedido * 100)
  ) {
    divergencias.push("valor");
  }
  if (pagamento?.currency_id !== pedido?.moeda) {
    divergencias.push("moeda");
  }
  if (
    expectedSellerId &&
    String(pagamento?.collector_id || "") !== String(expectedSellerId)
  ) {
    divergencias.push("vendedor_teste");
  }
  if (typeof pagamento?.status !== "string") {
    divergencias.push("status_ausente");
  }
  if (!/^\d+$/.test(String(pagamento?.id || ""))) {
    divergencias.push("id_pagamento_invalido");
  }

  return divergencias;
}

function pagamentoCorrespondeAoPedido(pedido, pagamento) {
  return obterDivergenciasPagamento(pedido, pagamento).length === 0;
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
  obterDivergenciasPagamento,
  obterDivergenciasPreferencia,
  pedidoPertenceAoUsuario,
  urlCheckout,
  verificarAssinaturaWebhook,
};
