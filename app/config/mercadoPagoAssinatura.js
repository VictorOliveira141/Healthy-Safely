function modoTesteMercadoPago() {
  return (
    process.env.MP_TEST_MODE === "true" || process.env.MP_ENV === "test"
  );
}

function emailPagador(usuario) {
  if (!modoTesteMercadoPago()) return usuario.email;

  const emailTeste = (process.env.MP_TEST_PAYER_EMAIL || "").trim();
  if (
    !process.env.MP_ACCESS_TOKEN?.startsWith("TEST-") ||
    !/^[^@\s]+@testuser\.com$/i.test(emailTeste)
  ) {
    const erro = new Error(
      "Modo de teste requer token TEST- e MP_TEST_PAYER_EMAIL de uma conta de teste do Mercado Pago.",
    );
    erro.code = "MP_TEST_CONFIGURATION";
    throw erro;
  }

  return emailTeste;
}

module.exports = { modoTesteMercadoPago, emailPagador };
