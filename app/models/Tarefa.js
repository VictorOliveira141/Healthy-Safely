var pool = require("../../app/config/pool_conexoes");

const tarefaModel = {

  listarPorUsuario: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY concluida ASC, id ASC",
        [usuarioId]);
      return linhas;
    } catch (e) { return []; }
  },

  buscarPorId: async (id, usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?", [id, usuarioId]);
      return linhas[0] || null;
    } catch (e) { return null; }
  },

  criar: async ({ usuarioId, titulo, descricao, pontos, categoria, criadoPor, data, horario, repeticao, diaSemana }) => {
    try {
      const [r] = await pool.query(
        `INSERT INTO tarefas (usuario_id, criado_por, titulo, descricao, pontos, categoria, data, horario, repeticao, dia_semana)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          usuarioId,
          criadoPor || null,
          titulo,
          descricao || null,
          pontos || 10,
          categoria || "geral",
          data || null,
          horario || null,
          repeticao || "once",
          diaSemana || null,
        ]);
      return r;
    } catch (e) { console.log(e); return null; }
  },

  atualizar: async (id, usuarioId, { titulo, descricao, categoria, data, horario, repeticao, diaSemana }) => {
    try {
      const [r] = await pool.query(
        `UPDATE tarefas
         SET titulo = ?, descricao = ?, categoria = ?, data = ?, horario = ?, repeticao = ?, dia_semana = ?
         WHERE id = ? AND usuario_id = ?`,
        [
          titulo,
          descricao || null,
          categoria || "geral",
          data || null,
          horario || null,
          repeticao || "once",
          diaSemana || null,
          id,
          usuarioId,
        ]);
      return r;
    } catch (e) { console.log(e); return null; }
  },

  // Alterna conclusão e registra timestamp
  alternarConclusao: async (id, usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?", [id, usuarioId]);
      if (!linhas[0]) return null;
      const novo = linhas[0].concluida ? 0 : 1;
      await pool.query(
        `UPDATE tarefas SET concluida = ?,
         concluida_em = CASE WHEN ? = 1 THEN NOW() ELSE NULL END
         WHERE id = ?`, [novo, novo, id]);
      return { ...linhas[0], concluida: novo };
    } catch (e) { return null; }
  },

  excluir: async (id, usuarioId) => {
    try {
      await pool.query("DELETE FROM tarefas WHERE id = ? AND usuario_id = ?", [id, usuarioId]);
      return true;
    } catch (e) { return false; }
  },

  percentualSemanal: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN concluida=1 THEN 1 ELSE 0 END) AS concluidas
         FROM tarefas WHERE usuario_id = ?
         AND YEARWEEK(criado_em,1) = YEARWEEK(NOW(),1)`,
        [usuarioId]);
      const { total, concluidas } = linhas[0];
      if (!total) return 0;
      return Math.round((concluidas / total) * 100);
    } catch (e) { return 0; }
  },

  concluidasPorDia: async () => {
    try {
      const [linhas] = await pool.query(
        `SELECT DATE(concluida_em) AS dia, COUNT(*) AS total
         FROM tarefas WHERE concluida=1 AND concluida_em IS NOT NULL
           AND concluida_em >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(concluida_em) ORDER BY dia ASC`);
      return linhas;
    } catch (e) { return []; }
  },

  // Histórico de tarefas concluídas por data
  historicoPorData: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        `SELECT DATE(concluida_em) AS data,
                COUNT(*) AS total_concluidas,
                SUM(pontos) AS pontos_do_dia,
                GROUP_CONCAT(titulo ORDER BY concluida_em SEPARATOR ', ') AS tarefas
         FROM tarefas
         WHERE usuario_id = ? AND concluida = 1 AND concluida_em IS NOT NULL
         GROUP BY DATE(concluida_em)
         ORDER BY data DESC
         LIMIT 30`,
        [usuarioId]);
      return linhas;
    } catch (e) { return []; }
  },

  // Total de tarefas concluídas
  totalConcluidas: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT COUNT(*) AS total FROM tarefas WHERE usuario_id = ? AND concluida = 1",
        [usuarioId]);
      return linhas[0]?.total || 0;
    } catch (e) { return 0; }
  },
};

module.exports = { tarefaModel };

