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
           u.tipo,
           u.nivel,
           u.pontos,
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
      total_clientes: 0,
      total_profissionais: 0,
      pontos_totais: 0,
    };
    let tarefas = { total_tarefas: 0, tarefas_concluidas: 0 };
    let solic   = { total_solicitacoes: 0 };

    try {
      const [[r]] = await pool.query(
        `SELECT
           COUNT(*)                                                  AS total_usuarios,
           SUM(CASE WHEN tipo = 'cliente'      THEN 1 ELSE 0 END)   AS total_clientes,
           SUM(CASE WHEN tipo = 'profissional' THEN 1 ELSE 0 END)   AS total_profissionais,
           COALESCE(SUM(pontos), 0)                                  AS pontos_totais
         FROM usuarios`
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

    try {
      const [[r]] = await pool.query(
        `SELECT COUNT(*) AS total_solicitacoes
         FROM solicitacoes
         WHERE status = 'pendente'`
      );
      solic = r;
    } catch (e) {
    }

    return { ...totais, ...tarefas, ...solic };
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

  // ── Top 5 usuários por pontos ──────────────────────────────
  rankingUsuarios: async () => {
    try {
      const [linhas] = await pool.query(
        `SELECT
           u.id, u.nome, u.nomeusuario, u.nivel, u.pontos,
           SUM(CASE WHEN t.concluida = 1 THEN 1 ELSE 0 END) AS tarefas_concluidas
         FROM usuarios u
         LEFT JOIN tarefas t ON t.usuario_id = u.id
         WHERE u.tipo = 'cliente'
         GROUP BY u.id
         ORDER BY u.pontos DESC
         LIMIT 5`
      );
      return linhas;
    } catch (e) {
      console.error("[Admin.rankingUsuarios]", e.message);
      return [];
    }
  },

  // ── Solicitações ────────────────────────────────────────────
  listarSolicitacoes: async () => {
    try {
      const [linhas] = await pool.query(
        `SELECT
           s.id, s.tipo, s.status, s.mensagem, s.criado_em,
           up.nome AS paciente_nome, up.email AS paciente_email,
           uf.nome AS profissional_nome, uf.email AS prof_email,
           pf.area_atuacao
         FROM solicitacoes s
         JOIN usuarios up ON up.id = s.paciente_id
         JOIN usuarios uf ON uf.id = s.profissional_id
         JOIN profissionais pf ON pf.usuario_id = s.profissional_id
         ORDER BY s.criado_em DESC`
      );
      return linhas;
    } catch (e) {
      return [];
    }
  },

  // ── Aprovar solicitação ─────────────────────────────────────
  aprovarSolicitacao: async (id) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[s]] = await conn.query(
        "SELECT * FROM solicitacoes WHERE id = ?", [id]
      );
      if (!s) { await conn.rollback(); return false; }
      await conn.query(
        "UPDATE solicitacoes SET status = 'aprovada' WHERE id = ?", [id]
      );
      await conn.query(
        `INSERT INTO vinculos (paciente_id, profissional_id, status)
         VALUES (?, ?, 'ativo')
         ON DUPLICATE KEY UPDATE status = 'ativo'`,
        [s.paciente_id, s.profissional_id]
      );
      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      console.error("[Admin.aprovarSolicitacao]", e.message);
      return false;
    } finally {
      conn.release();
    }
  },

  // ── Rejeitar solicitação ────────────────────────────────────
  rejeitarSolicitacao: async (id) => {
    try {
      await pool.query(
        "UPDATE solicitacoes SET status = 'rejeitada' WHERE id = ?", [id]
      );
      return true;
    } catch (e) {
      console.error("[Admin.rejeitarSolicitacao]", e.message);
      return false;
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
