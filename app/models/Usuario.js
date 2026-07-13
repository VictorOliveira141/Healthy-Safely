var pool   = require("../../app/config/pool_conexoes");
var bcrypt = require("bcryptjs");

const usuarioModel = {

  buscarPorId: async (id) => {
    try {
      const [linhas] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [id]);
      return linhas[0] || null;
    } catch (e) { return null; }
  },

  buscarPorLogin: async (valor) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM usuarios WHERE email = ? OR nomeusuario = ?", [valor, valor]);
      return linhas[0] || null;
    } catch (e) { return null; }
  },

  buscarPorEmail: async (email) => {
    try {
      const [linhas] = await pool.query("SELECT * FROM usuarios WHERE email = ? LIMIT 1", [email]);
      return linhas[0] || null;
    } catch (e) { return null; }
  },

  gerarNomeUsuarioDisponivel: async (base) => {
    const baseLimpo = String(base || "usuario")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 20) || "usuario";

    let nomeusuario = baseLimpo;
    let contador = 1;

    while (await usuarioModel.nomeUsuarioExiste(nomeusuario)) {
      nomeusuario = `${baseLimpo}${contador}`;
      contador += 1;
      if (nomeusuario.length > 30) {
        nomeusuario = `${baseLimpo.slice(0, 30 - contador.toString().length)}${contador}`;
      }
    }

    return nomeusuario;
  },

  emailExiste: async (email) => {
    try {
      const [linhas] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
      return linhas.length > 0;
    } catch (e) { return false; }
  },

  nomeUsuarioExiste: async (nomeusuario) => {
    try {
      const [linhas] = await pool.query("SELECT id FROM usuarios WHERE nomeusuario = ?", [nomeusuario]);
      return linhas.length > 0;
    } catch (e) { return false; }
  },

  // Cria cliente + copia tarefas_padrao (transação)
  criarCliente: async ({ nome, nomeusuario, email, senha }) => {
    const senhaHash = await bcrypt.hash(senha, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        `INSERT INTO usuarios (nome, nomeusuario, email, senha, tipo, nivel)
         VALUES (?, ?, ?, ?, 'cliente', 'iniciante')`,
        [nome, nomeusuario, email, senhaHash]);
      const novoId = r.insertId;
      await conn.query(
        `INSERT INTO tarefas (usuario_id, titulo, pontos, categoria)
         SELECT ?, titulo, pontos, categoria FROM tarefas_padrao`, [novoId]);
      await conn.commit();
      const [linhas] = await conn.query("SELECT * FROM usuarios WHERE id = ?", [novoId]);
      return linhas[0];
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally { conn.release(); }
  },

  criarClienteGoogle: async ({ nome, nomeusuario, email, foto_perfil }) => {
    const senhaHash = await bcrypt.hash(`${Date.now()}-${Math.random()}-${email}`, 10);
    const [r] = await pool.query(
      `INSERT INTO usuarios (nome, nomeusuario, email, senha, tipo, nivel, foto_perfil)
       VALUES (?, ?, ?, ?, 'cliente', 'iniciante', ?)`,
      [nome, nomeusuario, email, senhaHash, foto_perfil || null],
    );
    const [linhas] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [r.insertId]);
    return linhas[0];
  },

  // Cria profissional + dados extras (transação)
  criarProfissional: async ({ nome, nomeusuario, email, senha, cref, areaAtuacao, tempoExperiencia, especialidades }) => {
    const senhaHash = await bcrypt.hash(senha, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        `INSERT INTO usuarios (nome, nomeusuario, email, senha, tipo, nivel)
         VALUES (?, ?, ?, ?, 'profissional', 'profissional')`,
        [nome, nomeusuario || null, email, senhaHash]);
      const novoId = r.insertId;
      await conn.query(
        `INSERT INTO profissionais (usuario_id, cref, area_atuacao, tempo_experiencia, especialidades)
         VALUES (?, ?, ?, ?, ?)`,
        [novoId, cref, areaAtuacao, tempoExperiencia, especialidades]);
      await conn.commit();
      const [linhas] = await conn.query("SELECT * FROM usuarios WHERE id = ?", [novoId]);
      return linhas[0];
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally { conn.release(); }
  },

  verificarSenha: async (senhaDigitada, senhaHash) => {
    return bcrypt.compare(senhaDigitada, senhaHash);
  },

  // Atualiza pontos e recalcula nível
  atualizarPontos: async (usuarioId, pontosGanhos) => {
    try {
      await pool.query("UPDATE usuarios SET pontos = pontos + ? WHERE id = ?", [pontosGanhos, usuarioId]);
      const [linhas] = await pool.query("SELECT pontos FROM usuarios WHERE id = ?", [usuarioId]);
      const total = linhas[0]?.pontos || 0;
      let nivel = "iniciante";
      if (total >= 600) nivel = "elite";
      else if (total >= 300) nivel = "avancado";
      else if (total >= 100) nivel = "intermediario";
      await pool.query("UPDATE usuarios SET nivel = ? WHERE id = ?", [nivel, usuarioId]);
      return { pontos: total, nivel };
    } catch (e) { return null; }
  },

  // Listar profissionais disponíveis com busca
  listarProfissionais: async (busca = "") => {
    try {
      const t = `%${busca}%`;
      const [linhas] = await pool.query(
        `SELECT u.id, u.nome, u.email, u.foto_perfil,
                p.cref, p.area_atuacao, p.especialidades, p.tempo_experiencia
         FROM usuarios u
         INNER JOIN profissionais p ON p.usuario_id = u.id
         WHERE u.tipo = 'profissional' AND p.disponivel = 1
           AND (u.nome LIKE ? OR p.area_atuacao LIKE ? OR p.especialidades LIKE ?)
         ORDER BY u.nome ASC`, [t, t, t]);
      return linhas;
    } catch (e) { return []; }
  },

  // Lista todos os clientes com stats (para profissional)
  listarPacientes: async () => {
    try {
      const [linhas] = await pool.query(
        `SELECT u.id, u.nome, u.nomeusuario, u.email, u.nivel, u.pontos, u.criado_em,
                COUNT(t.id)                                          AS total_tarefas,
                SUM(CASE WHEN t.concluida = 1 THEN 1 ELSE 0 END)   AS tarefas_concluidas,
                ROUND(IFNULL(SUM(CASE WHEN t.concluida=1 THEN 1 ELSE 0 END),0)
                      / NULLIF(COUNT(t.id),0)*100,0)               AS pct
         FROM usuarios u
         LEFT JOIN tarefas t ON t.usuario_id = u.id
         WHERE u.tipo = 'cliente'
         GROUP BY u.id ORDER BY u.pontos DESC, u.nome ASC`);
      return linhas;
    } catch (e) { return []; }
  },

  // Busca tarefas de um cliente específico (para profissional)
  buscarTarefasCliente: async (clienteId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY concluida ASC, criado_em DESC",
        [clienteId]);
      return linhas;
    } catch (e) { return []; }
  },

  // Deletar usuário (admin)
  deletar: async (id) => {
    try {
      await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
      return true;
    } catch (e) { return false; }
  },

  // Vínculos
  solicitarVinculo: async (pacienteId, profissionalId) => {
    try {
      await pool.query(
        `INSERT IGNORE INTO vinculos (paciente_id, profissional_id, status)
         VALUES (?, ?, 'pendente')`, [pacienteId, profissionalId]);
      await pool.query(
        `INSERT INTO solicitacoes (paciente_id, profissional_id, tipo, status)
         VALUES (?, ?, 'vinculo', 'pendente')`, [pacienteId, profissionalId]);
      return true;
    } catch (e) { return false; }
  },

  buscarVinculo: async (pacienteId) => {
    try {
      const [linhas] = await pool.query(
        `SELECT v.*, u.nome AS prof_nome, p.area_atuacao
         FROM vinculos v
         JOIN usuarios u ON u.id = v.profissional_id
         JOIN profissionais p ON p.usuario_id = v.profissional_id
         WHERE v.paciente_id = ? AND v.status IN ('pendente','ativo')
         LIMIT 1`, [pacienteId]);
      return linhas[0] || null;
    } catch (e) { return null; }
  },

  // Criar notificação
  criarNotificacao: async (usuarioId, mensagem) => {
    try {
      await pool.query(
        "INSERT INTO notificacoes (usuario_id, mensagem) VALUES (?, ?)",
        [usuarioId, mensagem]);
      return true;
    } catch (e) { console.error("Erro notificacao:", e); return false; }
  },

  // Listar notificações do usuário
  listarNotificacoes: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY criado_em DESC LIMIT 50",
        [usuarioId]);
      return linhas;
    } catch (e) { return []; }
  },

  // Marcar notificações como lidas
  marcarTodasLidas: async (usuarioId) => {
    try {
      await pool.query("UPDATE notificacoes SET lida = 1 WHERE usuario_id = ?", [usuarioId]);
      return true;
    } catch (e) { return false; }
  },

  // Listar solicitações de vínculo para um profissional
  listarSolicitacoesProfissional: async (profissionalId) => {
    try {
      const [linhas] = await pool.query(
        `SELECT s.*, u.nome AS paciente_nome, u.email AS paciente_email
         FROM solicitacoes s
         JOIN usuarios u ON u.id = s.paciente_id
         WHERE s.profissional_id = ? AND s.status = 'pendente'
         ORDER BY s.criado_em DESC`,
        [profissionalId]);
      return linhas;
    } catch (e) { return []; }
  },

  // Profissional aceita/recusa vínculo
  gerenciarVinculo: async (solicitacaoId, acao) => {
    const statusSolic = acao === "aprovar" ? "aprovada" : "rejeitada";
    const statusVinc  = acao === "aprovar" ? "ativo"    : "recusado";
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Atualiza a solicitação
      await conn.query(
        "UPDATE solicitacoes SET status = ? WHERE id = ?",
        [statusSolic, solicitacaoId]);
      if (acao === "aprovar") {
        // Busca paciente_id e profissional_id
        const [rows] = await conn.query(
          "SELECT paciente_id, profissional_id FROM solicitacoes WHERE id = ?",
          [solicitacaoId]);
        if (rows[0]) {
          await conn.query(
            `UPDATE vinculos SET status = ? WHERE paciente_id = ? AND profissional_id = ?`,
            [statusVinc, rows[0].paciente_id, rows[0].profissional_id]);
        }
      }
      await conn.commit();
      return true;
    } catch(e) {
      await conn.rollback();
      throw e;
    } finally { conn.release(); }
  },

  // Registrar sono
  registrarSono: async (usuarioId, horasDormidas, qualidade) => {
    try {
      await pool.query(
        `INSERT INTO registros_sono (usuario_id, horas_dormidas, qualidade, data)
         VALUES (?, ?, ?, CURDATE())
         ON DUPLICATE KEY UPDATE horas_dormidas = VALUES(horas_dormidas), qualidade = VALUES(qualidade)`,
        [usuarioId, horasDormidas, qualidade]);
      return true;
    } catch (e) { console.error(e); return false; }
  },

  // Listar registros de sono
  listarSono: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM registros_sono WHERE usuario_id = ? ORDER BY data DESC LIMIT 14",
        [usuarioId]);
      return linhas;
    } catch (e) { return []; }
  },

  // Buscar dados reais do perfil
  buscarPerfilCompleto: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        `SELECT u.*,
                COUNT(DISTINCT t.id)                                     AS total_tarefas,
                SUM(CASE WHEN t.concluida=1 THEN 1 ELSE 0 END)          AS tarefas_concluidas,
                (SELECT COUNT(*) FROM notificacoes n WHERE n.usuario_id=u.id AND n.lida=0) AS notif_nao_lidas
         FROM usuarios u
         LEFT JOIN tarefas t ON t.usuario_id = u.id
         WHERE u.id = ?
         GROUP BY u.id`,
        [usuarioId]);
      return linhas[0] || null;
    } catch (e) { return null; }
  },
};

module.exports = { usuarioModel };


// Adicionar métodos extras ao usuarioModel (append)
