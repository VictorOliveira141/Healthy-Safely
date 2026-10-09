var pool = require("../../app/config/pool_conexoes");
const {
  hojeSaoPaulo,
  dataSaoPaulo,
  concluidaAgora,
} = require("../utils/progressao");

const tarefaModel = {
  listarPorUsuario: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY concluida ASC, id ASC",
        [usuarioId],
      );
      return linhas;
    } catch (e) {
      return [];
    }
  },

  buscarPorId: async (id, usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?",
        [id, usuarioId],
      );
      return linhas[0] || null;
    } catch (e) {
      return null;
    }
  },

  criar: async ({
    usuarioId,
    titulo,
    descricao,
    categoria,
    data,
    horario,
    repeticao,
    diaSemana,
  }) => {
    const [r] = await pool.query(
      `INSERT INTO tarefas (usuario_id, titulo, descricao, categoria, data, horario, repeticao, dia_semana)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        titulo,
        descricao || null,
        categoria || "geral",
        data || null,
        horario || null,
        repeticao || "once",
        diaSemana || null,
      ],
    );
    return r.insertId;
  },

  atualizar: async (
    id,
    usuarioId,
    { titulo, descricao, categoria, data, horario, repeticao, diaSemana },
  ) => {
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
        ],
      );
      return r;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  // Alterna conclusão e registra timestamp.
  // Além do campo "concluida" (usado pelo dashboard e pelas tarefas), grava
  // uma linha por tarefa e por dia em tarefas_conclusoes, que é a fonte da
  // página Progressão. Se essa tabela ainda não existir, a conclusão da
  // tarefa continua funcionando normalmente.
  alternarConclusao: async (id, usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?",
        [id, usuarioId],
      );
      const tarefa = linhas[0];
      if (!tarefa) return null;

      const hoje = hojeSaoPaulo();
      // Para tarefas recorrentes, "concluída" vale só para a ocorrência atual
      const jaConcluida = concluidaAgora(tarefa, hoje);
      const novo = jaConcluida ? 0 : 1;
      const diaDaConclusaoAnterior = tarefa.concluida_em
        ? dataSaoPaulo(tarefa.concluida_em)
        : hoje;

      await pool.query(
        `UPDATE tarefas SET concluida = ?,
         concluida_em = CASE WHEN ? = 1 THEN NOW() ELSE NULL END
         WHERE id = ?`,
        [novo, novo, id],
      );

      try {
        if (novo === 1) {
          await pool.query(
            `INSERT INTO tarefas_conclusoes (usuario_id, tarefa_id, categoria, data_referencia)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE concluida_em = NOW()`,
            [usuarioId, tarefa.id, tarefa.categoria || "geral", hoje],
          );
        } else {
          await pool.query(
            `DELETE FROM tarefas_conclusoes
             WHERE tarefa_id = ? AND usuario_id = ? AND data_referencia = ?`,
            [tarefa.id, usuarioId, diaDaConclusaoAnterior],
          );
        }
      } catch (erroHistorico) {
        console.error("Histórico de conclusões:", erroHistorico.message);
      }

      return { ...tarefa, concluida: novo };
    } catch (e) {
      return null;
    }
  },

  excluir: async (id, usuarioId) => {
    try {
      await pool.query("DELETE FROM tarefas WHERE id = ? AND usuario_id = ?", [
        id,
        usuarioId,
      ]);
      return true;
    } catch (e) {
      return false;
    }
  },

  percentualSemanal: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN concluida=1 THEN 1 ELSE 0 END) AS concluidas
         FROM tarefas WHERE usuario_id = ?
         AND YEARWEEK(criado_em,1) = YEARWEEK(NOW(),1)`,
        [usuarioId],
      );
      const { total, concluidas } = linhas[0];
      if (!total) return 0;
      return Math.round((concluidas / total) * 100);
    } catch (e) {
      return 0;
    }
  },

  concluidasPorDia: async () => {
    try {
      const [linhas] = await pool.query(
        `SELECT DATE(concluida_em) AS dia, COUNT(*) AS total
         FROM tarefas WHERE concluida=1 AND concluida_em IS NOT NULL
           AND concluida_em >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(concluida_em) ORDER BY dia ASC`,
      );
      return linhas;
    } catch (e) {
      return [];
    }
  },

  // Histórico de tarefas concluídas por data
  historicoPorData: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        `SELECT DATE(concluida_em) AS data,
                COUNT(*) AS total_concluidas,
                GROUP_CONCAT(titulo ORDER BY concluida_em SEPARATOR ', ') AS tarefas
         FROM tarefas
         WHERE usuario_id = ? AND concluida = 1 AND concluida_em IS NOT NULL
         GROUP BY DATE(concluida_em)
         ORDER BY data DESC
         LIMIT 30`,
        [usuarioId],
      );
      return linhas;
    } catch (e) {
      return [];
    }
  },

  // Dados da página Progressão (somente do usuário informado).
  // Lança erro se a tabela tarefas_conclusoes ainda não existir.
  dadosProgressao: async (usuarioId, desdeHistorico) => {
    const [[tarefas], [conclusoes], [historico]] = await Promise.all([
      pool.query(
        `SELECT id, repeticao, dia_semana,
                DATE_FORMAT(data, '%Y-%m-%d') AS data,
                DATE_FORMAT(criado_em, '%Y-%m-%d') AS criado_em
         FROM tarefas WHERE usuario_id = ?`,
        [usuarioId],
      ),
      pool.query(
        `SELECT id, tarefa_id, DATE_FORMAT(data_referencia, '%Y-%m-%d') AS dia
         FROM tarefas_conclusoes WHERE usuario_id = ?`,
        [usuarioId],
      ),
      pool.query(
        `SELECT DATE_FORMAT(c.data_referencia, '%Y-%m-%d') AS dia,
                COALESCE(t.titulo, 'Tarefa removida') AS titulo
         FROM tarefas_conclusoes c
         LEFT JOIN tarefas t ON t.id = c.tarefa_id
         WHERE c.usuario_id = ? AND c.data_referencia >= ?
         ORDER BY c.data_referencia DESC, c.concluida_em ASC`,
        [usuarioId, desdeHistorico],
      ),
    ]);
    return { tarefas, conclusoes, historico };
  },

  // Total de tarefas concluídas
  totalConcluidas: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT COUNT(*) AS total FROM tarefas WHERE usuario_id = ? AND concluida = 1",
        [usuarioId],
      );
      return linhas[0]?.total || 0;
    } catch (e) {
      return 0;
    }
  },
};

module.exports = { tarefaModel };
