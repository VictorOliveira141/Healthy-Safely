// ============================================================
// scripts/checarTarefasPush.js
// Executado pelo Render Cron Job a cada minuto. Roda, verifica
// as tarefas do minuto atual, envia os pushes e encerra.
// ============================================================
require("dotenv").config();

const pool = require("../config/pool_conexoes");
const {
  verificarEEnviarNotificacoes,
} = require("../services/notificacaoPushService");

(async () => {
  try {
    const resultado = await verificarEEnviarNotificacoes();
    console.log(
      `[checarTarefasPush] tarefas verificadas: ${resultado.verificadas} | notificações enviadas: ${resultado.enviadas}`,
    );
  } catch (erro) {
    console.error("[checarTarefasPush] erro:", erro);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();