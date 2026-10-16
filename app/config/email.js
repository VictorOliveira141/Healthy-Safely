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

async function enviarEmailConfirmacaoEmail(email, token, req) {
  const host = req.get("host");
  const protocol = req.protocol || "http";
  const baseURL = process.env.APP_URL || `${protocol}://${host}`;
  const url = `${baseURL}/email/confirmar/${encodeURIComponent(token)}`;

  if (!process.env.BREVO_API_KEY) {
    console.log("[EMAIL] API do Brevo não configurada.");
    console.log("[EMAIL] Link de confirmação:", url);
    return { ok: true, simulated: true };
  }

  const remetente =
    process.env.BREVO_FROM_EMAIL || "healthysafely2026@gmail.com";

  try {
    const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "Healthy Safely", email: remetente },
        to: [{ email }],
        subject: "Confirme seu novo e-mail | Healthy Safely",
        text: `Para confirmar este endereço de e-mail, acesse o link abaixo. Ele expira em uma hora:\n\n${url}`,
        htmlContent: `<div style="font-family:Arial,sans-serif;color:#1f2937"><h2>Confirme seu novo e-mail</h2><p>Para concluir a alteração do e-mail da sua conta, clique no link abaixo. Ele expira em uma hora.</p><p><a href="${url}">Confirmar novo e-mail</a></p><p>Se você não solicitou esta alteração, ignore esta mensagem.</p></div>`,
      }),
    });

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(dados.message || `Brevo retornou HTTP ${resposta.status}.`);
    }
    return { ok: true, simulated: false };
  } catch (error) {
    console.error("Erro ao enviar confirmação de e-mail:", error.message);
    return { ok: false, simulated: false };
  }
}

function escaparHtml(valor) {
  return String(valor || "").replace(/[&<>"']/g, (caractere) => {
    const entidades = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entidades[caractere];
  });
}

async function enviarEmailRespostaSuporte({
  email,
  nome,
  tipo,
  mensagem,
  resposta,
}) {
  if (!process.env.BREVO_API_KEY) {
    return { ok: false, simulated: true, provider: "brevo" };
  }

  if (!email) {
    return { ok: false, simulated: false, error: "Destinatário ausente." };
  }

  const remetente =
    process.env.BREVO_FROM_EMAIL || "healthysafely2026@gmail.com";
  const timeoutMs = Number(process.env.EMAIL_TIMEOUT_MS || 20000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const respostaHtml = escaparHtml(resposta).replace(/\n/g, "<br>");
  const mensagemHtml = escaparHtml(mensagem).replace(/\n/g, "<br>");

  try {
    const respostaHttp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "Healthy Safely", email: remetente },
        to: [{ email }],
        subject: "Resposta do suporte | Healthy Safely",
        text: `Olá, ${nome}.\n\nNossa equipe respondeu sua solicitação sobre ${tipo}.\n\nSua mensagem:\n${mensagem}\n\nResposta:\n${resposta}\n\nEquipe Healthy Safely`,
        htmlContent: `<div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6"><h2>Resposta do suporte</h2><p>Olá, ${escaparHtml(nome)}.</p><p>Nossa equipe respondeu sua solicitação sobre <strong>${escaparHtml(tipo)}</strong>.</p><div style="padding:14px;background:#f3f8f5;border-left:4px solid #1a8a75"><strong>Resposta</strong><p>${respostaHtml}</p></div><p style="color:#667085;font-size:13px">Sua mensagem: ${mensagemHtml}</p><p>Equipe Healthy Safely</p></div>`,
      }),
      signal: controller.signal,
    });

    const dados = await respostaHttp.json().catch(() => ({}));
    if (!respostaHttp.ok) {
      throw new Error(
        dados.message || `Brevo retornou HTTP ${respostaHttp.status}.`,
      );
    }

    console.log("[EMAIL] Resposta de suporte enviada.", dados.messageId);
    return { ok: true, simulated: false, messageId: dados.messageId };
  } catch (error) {
    const mensagemErro =
      error?.name === "AbortError"
        ? `Timeout ao enviar e-mail após ${timeoutMs}ms.`
        : error?.message || String(error);
    console.error("[EMAIL] Erro ao enviar resposta de suporte:", mensagemErro);
    return { ok: false, simulated: false, error: mensagemErro };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  enviarEmailResetSenha,
  gerarUrlRecuperacao,
  enviarEmailConfirmacaoEmail,
  enviarEmailRespostaSuporte,
};