const pool = require("../config/pool_conexoes");

const adminModel = {
  async estatisticasGerais() {
    const [usuarios] = await pool.query(`
      SELECT
        COUNT(*) AS total_usuarios,
        SUM(criado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS novos_7_dias
      FROM usuarios
    `);

    const [tarefas] = await pool.query(`
      SELECT
        COUNT(*) AS total_tarefas,
        COALESCE(SUM(concluida = 1), 0) AS tarefas_concluidas
      FROM tarefas
    `);

    const totalTarefas = Number(tarefas[0]?.total_tarefas || 0);
    const tarefasConcluidas = Number(tarefas[0]?.tarefas_concluidas || 0);

    return {
      total_usuarios: Number(usuarios[0]?.total_usuarios || 0),
      novos_7_dias: Number(usuarios[0]?.novos_7_dias || 0),
      total_tarefas: totalTarefas,
      tarefas_concluidas: tarefasConcluidas,
      taxa_conclusao: totalTarefas
        ? Math.round((tarefasConcluidas / totalTarefas) * 100)
        : 0,
    };
  },

  async listarUsuariosRecentes(limite = 8) {
    const limiteSeguro = Math.min(Math.max(Number(limite) || 8, 1), 20);

    const [linhas] = await pool.query(
      `SELECT id, nome, nomeusuario, email, foto_perfil, criado_em
       FROM usuarios
       ORDER BY criado_em DESC
       LIMIT ${limiteSeguro}`,
    );

    return linhas;
  },

  async listarUsuarios({ busca = "", pagina = 1, porPagina = 15 } = {}) {
    const paginaSegura = Math.max(Number(pagina) || 1, 1);
    const limite = Math.min(Math.max(Number(porPagina) || 15, 5), 50);
    const offset = (paginaSegura - 1) * limite;
    const termo = String(busca || "").trim();
    const like = `%${termo}%`;

    const where = termo
      ? `WHERE nome LIKE ? OR nomeusuario LIKE ? OR email LIKE ?`
      : "";
    const parametros = termo ? [like, like, like] : [];

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM usuarios ${where}`,
      parametros,
    );

    const [usuarios] = await pool.query(
      `SELECT
         u.id,
         u.nome,
         u.nomeusuario,
         u.email,
         u.foto_perfil,
         u.criado_em,
         u.onboarding_concluido,
         COUNT(t.id) AS total_tarefas,
         COALESCE(SUM(t.concluida = 1), 0) AS tarefas_concluidas
       FROM usuarios u
       LEFT JOIN tarefas t ON t.usuario_id = u.id
       ${termo ? "WHERE u.nome LIKE ? OR u.nomeusuario LIKE ? OR u.email LIKE ?" : ""}
       GROUP BY u.id
       ORDER BY u.criado_em DESC
       LIMIT ${limite} OFFSET ${offset}`,
      termo ? [like, like, like] : [],
    );

    return {
      usuarios,
      total: Number(total || 0),
      pagina: paginaSegura,
      porPagina: limite,
      totalPaginas: Math.max(Math.ceil(Number(total || 0) / limite), 1),
      busca: termo,
    };
  },

  async buscarUsuarioPorId(id) {
    const [linhas] = await pool.query(
      `SELECT
         u.id,
         u.nome,
         u.nomeusuario,
         u.email,
         u.foto_perfil,
         u.criado_em,
         u.onboarding_concluido,
         COUNT(t.id) AS total_tarefas,
         COALESCE(SUM(t.concluida = 1), 0) AS tarefas_concluidas,
         MAX(t.concluida_em) AS ultima_tarefa_concluida
       FROM usuarios u
       LEFT JOIN tarefas t ON t.usuario_id = u.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [id],
    );

    return linhas[0] || null;
  },

  async listarAtividadeUsuario(id) {
    const [tarefas] = await pool.query(
      `SELECT id, titulo, categoria, concluida, data, horario, criado_em, concluida_em
       FROM tarefas
       WHERE usuario_id = ?
       ORDER BY criado_em DESC
       LIMIT 20`,
      [id],
    );

    return tarefas;
  },

  async deletarUsuario(id) {
    const [resultado] = await pool.query(
      "DELETE FROM usuarios WHERE id = ?",
      [id],
    );

    return resultado.affectedRows > 0;
  },

  async estatisticasSuporte() {
    const [linhas] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'pendente'), 0) AS pendentes,
        COALESCE(SUM(status = 'respondido'), 0) AS respondidos,
        COALESCE(SUM(status = 'resolvido'), 0) AS resolvidos
      FROM suporte
    `);

    return {
      total: Number(linhas[0]?.total || 0),
      pendentes: Number(linhas[0]?.pendentes || 0),
      respondidos: Number(linhas[0]?.respondidos || 0),
      resolvidos: Number(linhas[0]?.resolvidos || 0),
    };
  },

  async listarSuporte({ status = "" } = {}) {
    const valorStatus = ["pendente", "respondido", "resolvido"].includes(status)
      ? status
      : "";

    const [linhas] = await pool.query(
      `SELECT
         s.id,
         s.usuario_id,
         s.nome,
         s.email,
         s.tipo,
         s.mensagem,
         s.status,
         s.resposta,
         s.respondido_em,
         s.criado_em
       FROM suporte s
       ${valorStatus ? "WHERE s.status = ?" : ""}
       ORDER BY
         CASE s.status
           WHEN 'pendente' THEN 1
           WHEN 'respondido' THEN 2
           WHEN 'resolvido' THEN 3
           ELSE 4
         END,
         s.criado_em DESC`,
      valorStatus ? [valorStatus] : [],
    );

    return linhas;
  },

  async responderSuporte(id, resposta) {
    const texto = String(resposta || "").trim();

    if (!texto) return false;

    const [resultado] = await pool.query(
      `UPDATE suporte
       SET resposta = ?, status = 'respondido', respondido_em = NOW(), atualizado_em = NOW()
       WHERE id = ?`,
      [texto, id],
    );

    return resultado.affectedRows > 0;
  },

  async alterarStatusSuporte(id, status) {
    const statusValidos = ["pendente", "respondido", "resolvido"];

    if (!statusValidos.includes(status)) return false;

    const [resultado] = await pool.query(
      `UPDATE suporte
       SET status = ?,
           atualizado_em = NOW(),
           respondido_em = CASE
             WHEN ? = 'respondido' AND respondido_em IS NULL THEN NOW()
             WHEN ? = 'pendente' THEN NULL
             ELSE respondido_em
           END
       WHERE id = ?`,
      [status, status, status, id],
    );

    return resultado.affectedRows > 0;
  },
};

module.exports = { adminModel };
