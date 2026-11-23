const pool = require("../config/pool_conexoes");

const relatorioPremiumModel = {
  buscarSemanal: async (usuarioId, semanaInicio) => {
    const [linhas] = await pool.query(
      `SELECT conteudo
       FROM relatorios_premium_semanais
       WHERE usuario_id = ? AND semana_inicio = ? AND estado = 'pronto'
       LIMIT 1`,
      [usuarioId, semanaInicio],
    );
    return linhas[0]?.conteudo || null;
  },

  reservarSemanal: async (usuarioId, semanaInicio) => {
    const [insercao] = await pool.query(
      `INSERT INTO relatorios_premium_semanais (usuario_id, semana_inicio, estado)
       VALUES (?, ?, 'gerando')
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [usuarioId, semanaInicio],
    );

    if (insercao.affectedRows === 1) return { estado: "gerando" };

    const [reclamacao] = await pool.query(
      `UPDATE relatorios_premium_semanais
       SET estado = 'gerando', conteudo = NULL, criado_em = NOW()
       WHERE usuario_id = ? AND semana_inicio = ?
         AND estado = 'gerando'
         AND criado_em < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
      [usuarioId, semanaInicio],
    );
    if (reclamacao.affectedRows === 1) return { estado: "gerando" };

    const [linhas] = await pool.query(
      `SELECT estado, conteudo
       FROM relatorios_premium_semanais
       WHERE usuario_id = ? AND semana_inicio = ?
       LIMIT 1`,
      [usuarioId, semanaInicio],
    );
    const relatorio = linhas[0];
    if (!relatorio) throw new Error("Não foi possível reservar o relatório.");

    return relatorio.estado === "pronto"
      ? { estado: "pronto", conteudo: relatorio.conteudo }
      : { estado: "em_andamento" };
  },

  concluirSemanal: async (usuarioId, semanaInicio, conteudo) => {
    const [resultado] = await pool.query(
      `UPDATE relatorios_premium_semanais
       SET conteudo = ?, estado = 'pronto'
       WHERE usuario_id = ? AND semana_inicio = ? AND estado = 'gerando'`,
      [conteudo, usuarioId, semanaInicio],
    );
    if (resultado.affectedRows !== 1) {
      throw new Error("Não foi possível salvar o relatório semanal.");
    }
  },

  liberarSemanal: async (usuarioId, semanaInicio) => {
    await pool.query(
      `DELETE FROM relatorios_premium_semanais
       WHERE usuario_id = ? AND semana_inicio = ? AND estado = 'gerando'`,
      [usuarioId, semanaInicio],
    );
  },
};

module.exports = { relatorioPremiumModel };
