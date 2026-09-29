const crypto = require("crypto");
const { PreApproval } = require("mercadopago");
const mpClient = require("../config/mercadoPago");
const { usuarioModel } = require("../models/Usuario");
const { PRECO_PREMIUM } = require("../config/planos");

function baseUrl() {
  return (process.env.APP_URL || "").replace(/\/+$/, "");
}

// Confere a assinatura enviada pelo Mercado Pago no header x-signature.
// Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks#editor_5
function assinaturaValida(req) {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) {
    console.warn(
      "⚠️  MP_WEBHOOK_SECRET não definido — pulando validação da assinatura do webhook (só use assim em desenvolvimento).",
    );
    return true;
  }

  const xSignature = req.headers["x-signature"];
  const xRequestId = req.headers["x-request-id"];
  const dataId = req.query["data.id"] || req.body?.data?.id;

  if (!xSignature || !xRequestId || !dataId) return false;

  const partes = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [chave, valor] = p.split("=");
      return [chave.trim(), (valor || "").trim()];
    }),
  );

  if (!partes.ts || !partes.v1) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${partes.ts};`;
  const hashEsperado = crypto
    .createHmac("sha256", segredo)
    .update(manifest)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hashEsperado, "hex"),
    Buffer.from(partes.v1, "hex"),
  );
}

// Sincroniza o plano do usuário com o status atual de uma assinatura no Mercado Pago
async function sincronizarAssinatura(preapprovalId) {
  const preApproval = new PreApproval(mpClient);
  const assinatura = await preApproval.get({ id: preapprovalId });
  await usuarioModel.atualizarStatusAssinatura(preapprovalId, assinatura.status);
  return assinatura;
}

const assinaturaController = {
  // Cria a assinatura no Mercado Pago e redireciona o usuário para o checkout
  criarAssinatura: async (req, res) => {
    try {
      const usuario = req.session.usuario;

      if (!process.env.MP_ACCESS_TOKEN) {
        return res
          .status(503)
          .send("Pagamentos ainda não configurados. Tente novamente mais tarde.");
      }

      const preApproval = new PreApproval(mpClient);
      const resultado = await preApproval.create({
        body: {
          reason: "Healthy Safely Premium",
          back_url: `${baseUrl()}/assinatura/retorno`,
          payer_email: usuario.email,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: PRECO_PREMIUM,
            currency_id: "BRL",
          },
          status: "pending",
        },
      });

      await usuarioModel.vincularAssinatura(usuario.id, resultado.id);
      req.session.usuario.mp_preapproval_id = resultado.id;
      req.session.usuario.assinatura_status = "pending";

      res.redirect(resultado.init_point);
    } catch (e) {
      console.error("Erro ao criar assinatura no Mercado Pago:", e);
      res.redirect("/assinatura?erro=1");
    }
  },

  // Usuário volta do checkout do Mercado Pago (autorizado ou não)
  retorno: async (req, res) => {
    try {
      const usuario = req.session.usuario;
      if (usuario.mp_preapproval_id) {
        const assinatura = await sincronizarAssinatura(usuario.mp_preapproval_id);
        req.session.usuario.plano =
          assinatura.status === "authorized" ? "premium" : "free";
        req.session.usuario.assinatura_status = assinatura.status;
      }
    } catch (e) {
      console.error("Erro ao sincronizar retorno da assinatura:", e);
    }

    res.redirect("/assinatura");
  },

  // Cancela a assinatura ativa do usuário
  cancelarAssinatura: async (req, res) => {
    try {
      const usuario = req.session.usuario;

      if (!usuario.mp_preapproval_id) {
        return res.redirect("/assinatura");
      }

      const preApproval = new PreApproval(mpClient);
      await preApproval.update({
        id: usuario.mp_preapproval_id,
        body: { status: "cancelled" },
      });

      await usuarioModel.atualizarStatusAssinatura(
        usuario.mp_preapproval_id,
        "cancelled",
      );
      req.session.usuario.plano = "free";
      req.session.usuario.assinatura_status = "cancelled";

      res.redirect("/assinatura");
    } catch (e) {
      console.error("Erro ao cancelar assinatura:", e);
      res.redirect("/assinatura?erro=1");
    }
  },

  // Notificações assíncronas do Mercado Pago (mudança de status da assinatura)
  webhook: async (req, res) => {
    try {
      if (!assinaturaValida(req)) {
        console.warn("Webhook do Mercado Pago com assinatura inválida.");
        return res.sendStatus(401);
      }

      const tipo = req.body?.type || req.query.type;
      const preapprovalId = req.query["data.id"] || req.body?.data?.id;

      if (tipo === "subscription_preapproval" && preapprovalId) {
        await sincronizarAssinatura(preapprovalId);
      }

      res.sendStatus(200);
    } catch (e) {
      console.error("Erro ao processar webhook do Mercado Pago:", e);
      // Responde 200 mesmo em erro interno para o MP não ficar reenviando indefinidamente
      res.sendStatus(200);
    }
  },
};

module.exports = assinaturaController;
