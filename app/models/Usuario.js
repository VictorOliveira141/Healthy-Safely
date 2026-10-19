var crypto = require("crypto");
var pool = require("../../app/config/pool_conexoes");
var bcrypt = require("bcryptjs");

const usuarioModel = {
  buscarPorId: async (id) => {
    try {
      const [linhas] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [
        id,
      ]);
      return linhas[0] || null;
    } catch (e) {
      return null;
    }
  },

  buscarPorLogin: async (valor) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM usuarios WHERE email = ? OR nomeusuario = ?",
        [valor, valor],
      );
      return linhas[0] || null;
    } catch (e) {
      return null;
    }
  },

  buscarPorEmail: async (email) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM usuarios WHERE email = ? LIMIT 1",
        [email],
      );
      return linhas[0] || null;
    } catch (e) {
      return null;
    }
  },

  gerarTokenRecuperacao: async (email) => {
    try {
      const emailNormalizado = String(email || "")
        .trim()
        .toLowerCase();
      const usuario = await usuarioModel.buscarPorEmail(emailNormalizado);
      if (!usuario) return null;

      const token = crypto.randomBytes(32).toString("hex");
      await pool.query(`DELETE FROM password_reset_tokens WHERE email = ?`, [
        emailNormalizado,
      ]);
      await pool.query(
        `INSERT INTO password_reset_tokens (email, token, expira_em)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
        [emailNormalizado, token],
      );

      return { token, email: emailNormalizado };
    } catch (e) {
      console.error("Erro ao gerar token de recuperação:", e);
      return null;
    }
  },

  buscarPorTokenRecuperacao: async (token) => {
    try {
      const valor = String(token || "").trim();
      if (!valor) return null;

      const [linhas] = await pool.query(
        `SELECT prt.*, u.id AS usuario_id, u.nome, u.email AS usuario_email
         FROM password_reset_tokens prt
         JOIN usuarios u ON u.email = prt.email
         WHERE prt.token = ? AND prt.expira_em > NOW()
         LIMIT 1`,
        [valor],
      );

      return linhas[0] || null;
    } catch (e) {
      console.error("Erro ao buscar token de recuperação:", e);
      return null;
    }
  },

  alterarSenhaComToken: async (token, novaSenha) => {
    try {
      const tokenValido = await usuarioModel.buscarPorTokenRecuperacao(token);
      if (!tokenValido) return false;

      const senhaHash = await bcrypt.hash(novaSenha, 10);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("UPDATE usuarios SET senha = ? WHERE email = ?", [
          senhaHash,
          tokenValido.email,
        ]);
        await conn.query("DELETE FROM password_reset_tokens WHERE token = ?", [
          token,
        ]);
        await conn.commit();
        return true;
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (e) {
      console.error("Erro ao redefinir senha por token:", e);
      return false;
    }
  },

  atualizarPerfil: async (usuarioId, { nome, nomeusuario, foto_perfil }) => {
    if (foto_perfil) {
      await pool.query(
        "UPDATE usuarios SET nome = ?, nomeusuario = ?, foto_perfil = ? WHERE id = ?",
        [nome, nomeusuario, foto_perfil, usuarioId],
      );
      return;
    }

    await pool.query(
      "UPDATE usuarios SET nome = ?, nomeusuario = ? WHERE id = ?",
      [nome, nomeusuario, usuarioId],
    );
  },

  criarTokenAlteracaoEmail: async (usuarioId, novoEmail) => {
    const token = crypto.randomBytes(32).toString("hex");
    await pool.query("DELETE FROM email_change_tokens WHERE expira_em <= NOW()");
    await pool.query("DELETE FROM email_change_tokens WHERE usuario_id = ?", [
      usuarioId,
    ]);
    await pool.query(
      `INSERT INTO email_change_tokens (usuario_id, novo_email, token, expira_em)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [usuarioId, novoEmail, token],
    );
    return token;
  },

  cancelarTokenAlteracaoEmail: async (usuarioId) => {
    await pool.query("DELETE FROM email_change_tokens WHERE usuario_id = ?", [
      usuarioId,
    ]);
  },

  confirmarAlteracaoEmail: async (token) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [linhas] = await conn.query(
        `SELECT usuario_id, novo_email FROM email_change_tokens
         WHERE token = ? AND expira_em > NOW() FOR UPDATE`,
        [token],
      );
      const pendencia = linhas[0];
      if (!pendencia) {
        await conn.rollback();
        return null;
      }

      await conn.query("UPDATE usuarios SET email = ? WHERE id = ?", [
        pendencia.novo_email,
        pendencia.usuario_id,
      ]);
      await conn.query("DELETE FROM email_change_tokens WHERE token = ?", [
        token,
      ]);
      await conn.commit();
      return {
        sucesso: true,
        usuarioId: pendencia.usuario_id,
        email: pendencia.novo_email,
      };
    } catch (error) {
      await conn.rollback();
      console.error("Erro ao confirmar alteração de e-mail:", error);
      return null;
    } finally {
      conn.release();
    }
  },

  gerarNomeUsuarioDisponivel: async (base) => {
    const baseLimpo =
      String(base || "usuario")
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

  nomeUsuarioDisponivel: async (nomeusuario, usuarioId = null) => {
    try {
      let query = "SELECT id FROM usuarios WHERE nomeusuario = ?";
      const params = [nomeusuario];

      if (usuarioId) {
        query += " AND id != ?";
        params.push(usuarioId);
      }

      query += " LIMIT 1";

      const [linhas] = await pool.query(query, params);

      return linhas.length === 0;
    } catch (e) {
      console.error("Erro ao verificar disponibilidade do nome de usuário:", e);
      return false;
    }
  },

  emailExiste: async (email) => {
    try {
      const [linhas] = await pool.query(
        `SELECT id FROM usuarios WHERE email = ?
         UNION ALL
         SELECT usuario_id AS id FROM email_change_tokens WHERE novo_email = ?
         LIMIT 1`,
        [email, email],
      );
      return linhas.length > 0;
    } catch (e) {
      return false;
    }
  },

  nomeUsuarioExiste: async (nomeusuario) => {
    try {
      const [linhas] = await pool.query(
        "SELECT id FROM usuarios WHERE nomeusuario = ?",
        [nomeusuario],
      );
      return linhas.length > 0;
    } catch (e) {
      return false;
    }
  },

  // Cria usuário + copia tarefas padrão (transação)
  criarCliente: async ({ nome, nomeusuario, email, senha }) => {
    const senhaHash = await bcrypt.hash(senha, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        `INSERT INTO usuarios (nome, nomeusuario, email, senha)
         VALUES (?, ?, ?, ?)`,
        [nome, nomeusuario, email, senhaHash],
      );
      const novoId = r.insertId;
      await conn.query(
        `INSERT INTO tarefas (usuario_id, titulo, categoria)
         SELECT ?, titulo, categoria FROM tarefas_padrao`,
        [novoId],
      );
      await conn.commit();
      const [linhas] = await conn.query("SELECT * FROM usuarios WHERE id = ?", [
        novoId,
      ]);
      return linhas[0];
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  criarClienteGoogle: async ({
    nome,
    nomeusuario,
    email,
    foto_perfil,
    senha,
  }) => {
    const senhaHash = senha
      ? await bcrypt.hash(senha, 10)
      : await bcrypt.hash(`${Date.now()}-${Math.random()}-${email}`, 10);
    const [r] = await pool.query(
      `INSERT INTO usuarios (nome, nomeusuario, email, senha, foto_perfil)
       VALUES (?, ?, ?, ?, ?)`,
      [nome, nomeusuario, email, senhaHash, foto_perfil || null],
    );
    const [linhas] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [
      r.insertId,
    ]);
    return linhas[0];
  },

  salvarPerfilPesquisa: async (usuarioId, perfil) => {
    try {
      await pool.query("UPDATE usuarios SET perfil_pesquisa = ? WHERE id = ?", [
        JSON.stringify(perfil || {}),
        usuarioId,
      ]);
      return true;
    } catch (e) {
      console.error("Erro ao salvar perfil da pesquisa:", e);
      return false;
    }
  },

  atualizarOnboardingConcluido: async (usuarioId, concluido = true) => {
    try {
      await pool.query(
        "UPDATE usuarios SET onboarding_concluido = ? WHERE id = ?",
        [concluido ? 1 : 0, usuarioId],
      );
      return true;
    } catch (e) {
      console.error("Erro ao atualizar onboarding:", e);
      return false;
    }
  },

  verificarSenha: async (senhaDigitada, senhaHash) => {
    return bcrypt.compare(senhaDigitada, senhaHash);
  },

  // Deletar usuário (admin)
  deletar: async (id) => {
    try {
      await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Buscar usuário pelo id da assinatura no Mercado Pago
  buscarPorPreapprovalId: async (preapprovalId) => {
    try {
      const [linhas] = await pool.query(
        "SELECT * FROM usuarios WHERE mp_preapproval_id = ? LIMIT 1",
        [preapprovalId],
      );
      return linhas[0] || null;
    } catch (e) {
      console.error("Erro ao buscar usuário por preapproval:", e);
      return null;
    }
  },

  // Vincula a assinatura recém-criada ao usuário (antes da confirmação do pagamento)
  vincularAssinatura: async (usuarioId, preapprovalId) => {
    try {
      await pool.query(
        `UPDATE usuarios
         SET mp_preapproval_id = ?, assinatura_status = 'pending', assinatura_atualizada_em = NOW()
         WHERE id = ?`,
        [preapprovalId, usuarioId],
      );
      return true;
    } catch (e) {
      console.error("Erro ao vincular assinatura:", e);
      return false;
    }
  },

  // Atualiza o plano/status a partir do webhook do Mercado Pago
  atualizarStatusAssinatura: async (preapprovalId, status) => {
    try {
      const plano = status === "authorized" ? "premium" : "free";
      await pool.query(
        `UPDATE usuarios
         SET plano = ?, assinatura_status = ?, assinatura_atualizada_em = NOW()
         WHERE mp_preapproval_id = ?`,
        [plano, status, preapprovalId],
      );
      return true;
    } catch (e) {
      console.error("Erro ao atualizar status da assinatura:", e);
      return false;
    }
  },

  // Buscar dados reais do perfil
  buscarPerfilCompleto: async (usuarioId) => {
    try {
      const [linhas] = await pool.query(
        `SELECT u.*,
                COUNT(DISTINCT t.id)                                     AS total_tarefas,
                SUM(CASE WHEN t.concluida=1 THEN 1 ELSE 0 END)          AS tarefas_concluidas
         FROM usuarios u
         LEFT JOIN tarefas t ON t.usuario_id = u.id
         WHERE u.id = ?
         GROUP BY u.id`,
        [usuarioId],
      );
      return linhas[0] || null;
    } catch (e) {
      return null;
    }
  },
};

module.exports = { usuarioModel };

// Adicionar métodos extras ao usuarioModel (append)
