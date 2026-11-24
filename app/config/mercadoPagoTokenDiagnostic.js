const crypto = require("node:crypto");

function logMercadoPagoTokenDiagnostic({
  env = process.env,
  logger = console.info,
} = {}) {
  const token = env.MERCADOPAGO_ACCESS_TOKEN;
  const tokenLoaded = typeof token === "string" && token.trim().length > 0;
  const environment =
    typeof env.MERCADOPAGO_ENV === "string"
      ? env.MERCADOPAGO_ENV.trim() || null
      : null;

  const diagnostic = {
    token_loaded: tokenLoaded,
    ...(tokenLoaded
      ? {
          token_sha256: crypto
            .createHash("sha256")
            .update(token, "utf8")
            .digest("hex"),
        }
      : {}),
    environment,
  };

  logger(
    `[Mercado Pago] Diagnóstico de inicialização: ${JSON.stringify(diagnostic)}`,
  );
}

module.exports = { logMercadoPagoTokenDiagnostic };
