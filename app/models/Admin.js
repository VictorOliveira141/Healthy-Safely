const pool = require("../config/pool_conexoes");

const adminModel = {
  // ── Listar todos os usuários com estatísticas ──────────────
  listarTodosUsuarios: async () => {
    try {
      const [linhas] = await pool.query(
        `SELECT
           u.id,
           u.nome,
           u.nomeusuario,
           u.email,
           u.foto_perfil,
           u.criado_em,
           COUNT(t.id)                                          AS total_tarefas,
           SUM(CASE WHEN t.concluida = 1 THEN 1 ELSE 0 END)   AS tarefas_concluidas,
           ROUND(
             IFNULL(SUM(CASE WHEN t.concluida = 1 THEN 1 ELSE 0 END), 0)
             / NULLIF(COUNT(t.id), 0) * 100
           , 0)                                                AS pct_conclusao,
           MAX(t.criado_em)                                    AS ultima_atividade
         FROM usuarios u
         LEFT JOIN tarefas t ON t.usuario_id = u.id
         GROUP BY u.id
         ORDER BY u.criado_em DESC`
      );
      return linhas;
    } catch (err) {
      console.error("[Admin.listarTodosUsuarios] Erro:", err.message);
      return [];
    }
  },

  // ── Estatísticas gerais ────────────────────────────────────
  estatisticasGerais: async () => {
    let totais = {
      total_usuarios: 0,
    };
    let tarefas = { total_tarefas: 0, tarefas_concluidas: 0 };
    try {
      const [[r]] = await pool.query(
        `SELECT COUNT(*) AS total_usuarios FROM usuarios`
      );
      totais = r;
    } catch (e) {
      console.error("[Admin.estatisticasGerais] usuarios:", e.message);
    }

    try {
      const [[r]] = await pool.query(
        `SELECT
           COUNT(*)                                             AS total_tarefas,
           SUM(CASE WHEN concluida = 1 THEN 1 ELSE 0 END)     AS tarefas_concluidas
         FROM tarefas`
      );
      tarefas = r;
    } catch (e) {
      console.error("[Admin.estatisticasGerais] tarefas:", e.message);
    }

    return { ...totais, ...tarefas };
  },

  // ── Cadastros por dia (últimos 7 dias) ─────────────────────
  cadastrosPorDia: async () => {
    try {
      const [linhas] = await pool.query(
        `SELECT
           DATE(criado_em) AS dia,
           COUNT(*)        AS quantidade
         FROM usuarios
         WHERE criado_em >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(criado_em)
         ORDER BY dia ASC`
      );
      return linhas;
    } catch (e) {
      console.error("[Admin.cadastrosPorDia]", e.message);
      return [];
    }
  },

  // ── Tarefas concluídas por dia
  tarefasConcluidasPorDia: async () => {
    try {
      const [linhas] = await pool.query(
        `SELECT DATE(concluida_em) AS dia, COUNT(*) AS quantidade
         FROM tarefas
         WHERE concluida = 1
           AND concluida_em IS NOT NULL
           AND concluida_em >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(concluida_em)
         ORDER BY dia ASC`
      );
      return linhas;
    } catch (_) {
      try {
        const [linhas] = await pool.query(
          `SELECT DATE(criado_em) AS dia, COUNT(*) AS quantidade
           FROM tarefas
           WHERE concluida = 1
             AND criado_em >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
           GROUP BY DATE(criado_em)
           ORDER BY dia ASC`
        );
        return linhas;
      } catch (e2) {
        console.error("[Admin.tarefasConcluidasPorDia]", e2.message);
        return [];
      }
    }
  },

  // ── Deletar usuário ─────────────────────────────────────────
  deletarUsuario: async (id) => {
    try {
      await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
      return true;
    } catch (e) {
      console.error("[Admin.deletarUsuario]", e.message);
      return false;
    }
  },
};

module.exports = { adminModel };
