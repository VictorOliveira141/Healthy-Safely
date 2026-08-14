const nodemailer = require("nodemailer");

function gerarUrlRecuperacao(token, req) {
  const host = req.get("host");
  const protocol = req.protocol || "http";
  const baseURL = process.env.APP_URL || `${protocol}://${host}`;
  return `${baseURL}/redefinir-senha/${token}`;
}

async function enviarEmailResetSenha(email, token, req) {
  const remetente = process.env.SMTP_FROM || "Healthy Safely <noreply@healthysafely.com>";
  const url = gerarUrlRecuperacao(token, req);

  if (!process.env.SMTP_HOST) {
    console.log("[EMAIL] Simulação de envio de e-mail para recuperação de senha:");
    console.log(url);
    return { ok: true, simulated: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    // Timeouts to avoid hanging requests in environments that block SMTP
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 5000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 10000),
  });

  try {
    await transporter.sendMail({
      from: remetente,
      to: email,
      subject: "Recuperação de senha | Healthy Safely",
      text: `Use o link abaixo para redefinir sua senha:\n\n${url}\n\nSe você não solicitou isso, ignore este e-mail.`,
      html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2>Recuperação de senha</h2>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>Clique no botão abaixo para continuar:</p>
        <p>
          <a href="${url}" style="display:inline-block; padding:12px 20px; background:#5BBF6A; color:#fff; border-radius:8px; text-decoration:none;">Redefinir senha</a>
        </p>
        <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p>${url}</p>
      </div>
    `,
    });

    return { ok: true, simulated: false };
  } catch (err) {
    console.error('[EMAIL] Erro ao enviar e-mail de recuperação:', err && err.message ? err.message : err);
    console.log('[EMAIL] Link de recuperação (fallback):', url);
    // Não deixar a requisição travar indefinidamente — retorne sucesso parcial para o fluxo
    return { ok: false, simulated: false, error: err && err.message };
  }
}

module.exports = { enviarEmailResetSenha, gerarUrlRecuperacao };
