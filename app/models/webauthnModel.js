const db = require("../config/database/db");

const webauthnModel = {
  async salvarCredencial({
    usuario_id,
    credential_id,
    public_key,
    counter,
  }) {
    const [result] = await db.execute(
      `INSERT INTO webauthn_credentials
       (usuario_id, credential_id, public_key, counter)
       VALUES (?, ?, ?, ?)`,
      [usuario_id, credential_id, public_key, counter],
    );

    return result;
  },

  async buscarPorUsuario(usuario_id) {
    const [rows] = await db.execute(
      `SELECT *
       FROM webauthn_credentials
       WHERE usuario_id = ?`,
      [usuario_id],
    );

    return rows;
  },

  async buscarPorCredentialId(credential_id) {
    const [rows] = await db.execute(
      `SELECT *
       FROM webauthn_credentials
       WHERE credential_id = ?`,
      [credential_id],
    );

    return rows[0] || null;
  },

  async atualizarCounter(credential_id, counter) {
    await db.execute(
      `UPDATE webauthn_credentials
       SET counter = ?
       WHERE credential_id = ?`,
      [counter, credential_id],
    );
  },

  async removerPorUsuario(usuario_id) {
    const [result] = await db.execute(
      `DELETE FROM webauthn_credentials
       WHERE usuario_id = ?`,
      [usuario_id],
    );

    return result;
  },
};

module.exports = webauthnModel;