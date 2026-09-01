// ============================================================
// app/services/notificacaoPushService.js
// Verifica tarefas cujo horário chegou "agora" e dispara os
// pushes correspondentes. É chamado pelo Render Cron Job
// (scripts/checarTarefasPush.js), a cada minuto.
// ============================================================
const webpush = require("../config/webpush");
const pool = require("../config/pool_conexoes");
const { pushSubscriptionModel } = require("../models/PushSubscription");

const DIAS_SEMANA = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Usa o horário local do processo Node. No Render, defina a
// variável de ambiente TZ (ex.: America/Sao_Paulo) para que
// esse horário corresponda ao horário que os usuários digitam
// nas tarefas.
function contextoAtual() {
  const agora = new Date();
  const horaAtual = `${pad2(agora.getHours())}:${pad2(agora.getMinutes())}`;
  const dataAtual = `${agora.getFullYear()}-${pad2(agora.getMonth() + 1)}-${pad2(agora.getDate())}`;
  const diaSemanaAtual = DIAS_SEMANA[agora.getDay()];
  return { horaAtual, dataAtual, diaSemanaAtual };
}

async function buscarTarefasNoHorario(horaAtual, dataAtual, diaSemanaAtual) {
  const [linhas] = await pool.query(
    `SELECT id, usuario_id, titulo, horario, repeticao, dia_semana, data, concluida
     FROM tarefas
     WHERE horario IS NOT NULL
       AND TIME_FORMAT(horario, '%H:%i') = ?
       AND concluida = 0
       AND (
         (repeticao = 'once'   AND data = ?)
         OR  repeticao = 'daily'
         OR (repeticao = 'weekly' AND dia_semana = ?)
       )`,
    [horaAtual, dataAtual, diaSemanaAtual],
  );
  return linhas;
}

// Insere um "carimbo" de envio para esta ocorrência da tarefa.
// A chave única (tarefa_id, referencia) garante que, mesmo que
// o cron rode em paralelo/atrasado, a notificação nunca é
// enviada duas vezes para a mesma ocorrência.
async function registrarEnvioUnico(tarefaId, usuarioId, referencia) {
  try {
    await pool.query(
      `INSERT INTO push_notificacoes_enviadas (tarefa_id, usuario_id, referencia)
       VALUES (?, ?, ?)`,
      [tarefaId, usuarioId, referencia],
    );
    return true; // primeira vez para esta ocorrência
  } catch (e) {
    if (e?.code === "ER_DUP_ENTRY") return false; // já enviada
    console.error("Erro ao registrar envio de push:", e);
    return false;
  }
}

async function enviarParaAssinatura(assinatura, payload) {
  try {
    await webpush.sendNotification(
      {
        endpoint: assinatura.endpoint,
        keys: { p256dh: assinatura.p256dh, auth: assinatura.auth },
      },
      payload,
    );
    return true;
  } catch (erro) {
    const status = erro?.statusCode;
    if (status === 404 || status === 410) {
      // subscription expirada/revogada pelo navegador — remove do banco
      await pushSubscriptionModel.removerPorEndpoint(assinatura.endpoint);
    } else {
      console.error(
        "Erro ao enviar push:",
        status,
        erro?.body || erro?.message,
      );
    }
    return false;
  }
}

async function verificarEEnviarNotificacoes() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("VAPID não configurado — pulando verificação de push.");
    return { verificadas: 0, enviadas: 0 };
  }

  const { horaAtual, dataAtual, diaSemanaAtual } = contextoAtual();
  const tarefas = await buscarTarefasNoHorario(
    horaAtual,
    dataAtual,
    diaSemanaAtual,
  );

  let enviadas = 0;

  for (const tarefa of tarefas) {
    const referencia = dataAtual; // ocorrência de hoje
    const primeiraVez = await registrarEnvioUnico(
      tarefa.id,
      tarefa.usuario_id,
      referencia,
    );
    if (!primeiraVez) continue;

    const assinaturas = await pushSubscriptionModel.listarPorUsuario(
      tarefa.usuario_id,
    );
    if (!assinaturas.length) continue;

    const payload = JSON.stringify({
      title: tarefa.titulo,
      horario: String(tarefa.horario).slice(0, 5),
      tarefaId: tarefa.id,
      tag: `tarefa-${tarefa.id}-${referencia}`,
    });

    for (const assinatura of assinaturas) {
      const ok = await enviarParaAssinatura(assinatura, payload);
      if (ok) enviadas++;
    }
  }

  return { verificadas: tarefas.length, enviadas };
}

module.exports = { verificarEEnviarNotificacoes };