function gerarUrlRecuperacao(token, req) {
  const host = req.get("host");
  const protocol = req.protocol || "http";
  const baseURL = process.env.APP_URL || `${protocol}://${host}`;

  return `${baseURL}/redefinir-senha/${token}`;
}

async function enviarEmailResetSenha(email, token, req) {
  console.log("[EMAIL] FUNÇÃO DE RECUPERAÇÃO EXECUTADA");
  console.log("[EMAIL] Brevo configurado:", !!process.env.BREVO_API_KEY);

  const url = gerarUrlRecuperacao(token, req);

  if (!process.env.BREVO_API_KEY) {
    console.log("[EMAIL] API do Brevo não configurada.");
    console.log("[EMAIL] Link de recuperação:", url);

    return {
      ok: true,
      simulated: true,
      provider: "simulated",
    };
  }

  const remetente =
    process.env.BREVO_FROM_EMAIL || "healthysafely2026@gmail.com";

  const timeoutMs = Number(process.env.EMAIL_TIMEOUT_MS || 20000);

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },

      body: JSON.stringify({
        sender: {
          name: "Healthy Safely",
          email: remetente,
        },

        to: [
          {
            email,
          },
        ],

        subject: "Recuperação de senha | Healthy Safely",

        text: `Use o link abaixo para redefinir sua senha:

${url}

Se você não solicitou isso, ignore este e-mail.`,

        htmlContent: `
          <div style="font-family: Arial, sans-serif; color: #1f2937;">
            <h2>Recuperação de senha</h2>

            <p>Recebemos uma solicitação para redefinir sua senha.</p>

            <p>Clique no botão abaixo para continuar:</p>

            <p>
              <a
                href="${url}"
                style="
                  display:inline-block;
                  padding:12px 20px;
                  background:#5BBF6A;
                  color:#fff;
                  border-radius:8px;
                  text-decoration:none;
                "
              >
                Redefinir senha
              </a>
            </p>

            <p>
              Se o botão não funcionar, copie e cole este link no navegador:
            </p>

            <p>${url}</p>
          </div>
        `,
      }),

      signal: controller.signal,
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(
        dados.message ||
        `Brevo retornou erro HTTP ${resposta.status}.`
      );
    }

    console.log("[EMAIL] E-mail enviado pelo Brevo.");
    console.log("[EMAIL] messageId:", dados.messageId);

    return {
      ok: true,
      simulated: false,
      provider: "brevo",
      messageId: dados.messageId,
    };
  } catch (err) {
    const mensagem =
      err?.name === "AbortError"
        ? `Timeout ao enviar e-mail após ${timeoutMs}ms.`
        : err?.message || String(err);

    console.error(
      "[EMAIL] Erro ao enviar e-mail de recuperação:",
      mensagem
    );

    console.log("[EMAIL] Link de recuperação (fallback):", url);

    return {
      ok: false,
      simulated: false,
      provider: "brevo",
      error: mensagem,
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  enviarEmailResetSenha,
  gerarUrlRecuperacao,
};