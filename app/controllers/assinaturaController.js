const crypto = require("crypto");
const { Payment, Preference, PreApproval } = require("mercadopago");
const {
  assertTestEnvironment,
  createMercadoPagoClient,
  getWebhookSecret,
} = require("../config/mercadoPago");
const { PRECO_PREMIUM } = require("../config/planos");
const { usuarioModel } = require("../models/Usuario");
const { pagamentoMercadoPagoModel } = require("../models/PagamentoMercadoPago");
const {
  verificarAssinaturaWebhook,
} = require("../services/mercadoPagoService");
const {
  confirmarPagamentoMercadoPago,
} = require("../services/confirmarPagamentoMercadoPago");

function urlAplicacao(caminho) {
  const configurada = (process.env.APP_URL || "").trim();
  if (!configurada) throw new Error("APP_URL não configurada.");

  const base = new URL(configurada);
  const hostLocal = ["localhost", "127.0.0.1"].includes(base.hostname);
  if (base.protocol !== "https:" && !(base.protocol === "http:" && hostLocal)) {
    throw new Error("APP_URL deve usar HTTPS.");
  }

  return new URL(caminho, `${base.origin}/`).toString();
}

async function obterPagamentoConfirmado(pagamentoId, usuarioId = null) {
  const cliente = createMercadoPagoClient();
  const resultado = await confirmarPagamentoMercadoPago({
    pagamentoId,
    usuarioId,
    consultarPagamento: (id) => new Payment(cliente).get({ id }),
    buscarPedidoPorReferencia:
      pagamentoMercadoPagoModel.buscarPedidoPorReferencia,
    registrarPagamento: pagamentoMercadoPagoModel.registrarPagamento,
  });

  if (resultado.tipo !== "processado") {
    console.warn(
      `[Mercado Pago] Confirmação não processada: ${resultado.motivo}.`,
    );
  }

  return resultado.tipo === "processado" ? resultado.pagamento : null;
}

function statusDoPagamento(pagamento) {
  if (pagamento?.status === "approved") return "aprovado";
  if (pagamento?.status === "pending" || pagamento?.status === "in_process") {
    return "pendente";
  }
  if (pagamento?.status) return "recusado";
  return "verificando";
}

async function atualizarUsuarioDaSessao(req) {
  const usuario = await usuarioModel.buscarPorId(req.session.usuario.id);
  if (!usuario) return;
  delete usuario.senha;
  req.session.usuario = usuario;
}

const assinaturaController = {
  criarAssinatura: async (req, res) => {
    let referenciaExterna;
    try {
      if (!getWebhookSecret()) {
        return res.redirect("/assinatura?erro=1");
      }
      const cliente = createMercadoPagoClient();

      const usuarioId = req.session.usuario.id;
      referenciaExterna = crypto.randomUUID();
      await pagamentoMercadoPagoModel.criarPedido(
        usuarioId,
        referenciaExterna,
        PRECO_PREMIUM,
      );

      const preferencias = new Preference(cliente);
      const preferencia = await preferencias.create({
        body: {
          items: [
            {
              id: "healthy-safely-premium-30-dias",
              title: "Healthy Safely Premium (30 dias)",
              quantity: 1,
              currency_id: "BRL",
              unit_price: PRECO_PREMIUM,
            },
          ],
          external_reference: referenciaExterna,
          notification_url: urlAplicacao("/webhooks/mercadopago"),
          back_urls: {
            success: urlAplicacao("/assinatura/retorno"),
            pending: urlAplicacao("/assinatura/retorno"),
            failure: urlAplicacao("/assinatura/retorno"),
          },
          auto_return: "approved",
        },
      });

      if (
        !preferencia?.id ||
        preferencia.external_reference !== referenciaExterna ||
        !preferencia.sandbox_init_point
      ) {
        await pagamentoMercadoPagoModel.marcarPedidoFalhou(
          referenciaExterna,
        );
        return res.redirect("/assinatura?erro=1");
      }

      const vinculada = await pagamentoMercadoPagoModel.vincularPreferencia(
        referenciaExterna,
        preferencia.id,
      );
      if (!vinculada) {
        await pagamentoMercadoPagoModel.marcarPedidoFalhou(
          referenciaExterna,
        );
        return res.redirect("/assinatura?erro=1");
      }

      return res.redirect(preferencia.sandbox_init_point);
    } catch {
      if (referenciaExterna) {
        try {
          await pagamentoMercadoPagoModel.marcarPedidoFalhou(
            referenciaExterna,
          );
        } catch {
          console.error("Não foi possível atualizar o pedido de pagamento.");
        }
      }
      console.error(
        "Não foi possível criar o checkout Sandbox do Mercado Pago.",
      );
      return res.redirect("/assinatura?erro=1");
    }
  },

  retorno: async (req, res) => {
    let resultado;
    const pagamentoId = req.query.payment_id || req.query.collection_id;
    if (/^\d+$/.test(String(pagamentoId || ""))) {
      req.session.mercadoPagoPagamentoPendente = String(pagamentoId);
    }

    try {
      resultado = await obterPagamentoConfirmado(pagamentoId, req.session.usuario.id);
      await atualizarUsuarioDaSessao(req);
    } catch (error) {
      console.error(
        "Não foi possível consultar o pagamento no retorno.",
        error?.code || error?.status || error?.statusCode || "erro sem código",
      );
    }

    const status = statusDoPagamento(resultado);
    if (status === "aprovado" || status === "recusado") {
      delete req.session.mercadoPagoPagamentoPendente;
    }
    return res.redirect(`/assinatura?pagamento=${status}`);
  },

  verificarPagamento: async (req, res) => {
    let resultado;
    try {
      resultado = await obterPagamentoConfirmado(
        req.session.mercadoPagoPagamentoPendente,
        req.session.usuario.id,
      );
      await atualizarUsuarioDaSessao(req);
    } catch (error) {
      console.error(
        "Não foi possível consultar novamente o pagamento.",
        error?.code || error?.status || error?.statusCode || "erro sem código",
      );
    }

    const status = statusDoPagamento(resultado);
    if (status === "aprovado" || status === "recusado") {
      delete req.session.mercadoPagoPagamentoPendente;
    }
    return res.redirect(`/assinatura?pagamento=${status}`);
  },

  cancelarAssinatura: async (req, res) => {
    const usuario = req.session.usuario;
    if (!usuario.mp_preapproval_id) return res.redirect("/assinatura");

    try {
      const cliente = createMercadoPagoClient();
      await new PreApproval(cliente).update({
        id: usuario.mp_preapproval_id,
        body: { status: "cancelled" },
      });
      await usuarioModel.atualizarStatusAssinatura(
        usuario.mp_preapproval_id,
        "cancelled",
      );
      await atualizarUsuarioDaSessao(req);
      return res.redirect("/assinatura");
    } catch {
      console.error("Não foi possível cancelar a assinatura legada.");
      return res.redirect("/assinatura?erro=1");
    }
  },

  webhook: async (req, res) => {
    try {
      assertTestEnvironment();
    } catch {
      return res.sendStatus(503);
    }

    if (!verificarAssinaturaWebhook(req, getWebhookSecret())) {
      return res.sendStatus(401);
    }

    const tipo =
      req.body?.type ||
      req.query?.type ||
      req.body?.topic ||
      req.query?.topic;
    if (
      tipo !== "payment" &&
      !String(req.body?.action || "").startsWith("payment.")
    ) {
      return res.sendStatus(200);
    }

    const pagamentoId = req.query?.["data.id"] || req.body?.data?.id;
    if (!/^\d+$/.test(String(pagamentoId || ""))) {
      return res.sendStatus(400);
    }

    try {
      const pagamento = await obterPagamentoConfirmado(pagamentoId);
      return res.sendStatus(pagamento ? 200 : 500);
    } catch (error) {
      console.error(
        "Não foi possível processar a notificação de pagamento.",
        error?.code || error?.status || error?.statusCode || "erro sem código",
      );
      return res.sendStatus(500);
    }
  },
};

module.exports = assinaturaController;
