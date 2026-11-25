const pool = require("../../app/config/pool_conexoes");
const { pagamentoAprovado } = require("../services/mercadoPagoService");

const pagamentoMercadoPagoModel = {
  criarPedido: async (usuarioId, referenciaExterna, valor) => {
    const [resultado] = await pool.query(
      `INSERT INTO mp_pedidos
         (usuario_id, referencia_externa, valor, moeda, estado)
       VALUES (?, ?, ?, 'BRL', 'pending')`,
      [usuarioId, referenciaExterna, valor],
    );
    return resultado.insertId;
  },

  vincularPreferencia: async (referenciaExterna, preferenciaId) => {
    const [resultado] = await pool.query(
      `UPDATE mp_pedidos
       SET preferencia_id = ?, atualizado_em = UTC_TIMESTAMP()
       WHERE referencia_externa = ? AND preferencia_id IS NULL
         AND estado = 'pending'`,
      [preferenciaId, referenciaExterna],
    );
    return resultado.affectedRows === 1;
  },

  marcarPedidoFalhou: async (referenciaExterna) => {
    await pool.query(
      `UPDATE mp_pedidos
       SET estado = 'failed', atualizado_em = UTC_TIMESTAMP()
       WHERE referencia_externa = ? AND acesso_concedido_em IS NULL`,
      [referenciaExterna],
    );
  },

  buscarPedidoPorReferencia: async (referenciaExterna) => {
    const [linhas] = await pool.query(
      `SELECT id, usuario_id, referencia_externa, preferencia_id,
              valor, moeda, estado, acesso_concedido_em, premium_ate
       FROM mp_pedidos
       WHERE referencia_externa = ?
       LIMIT 1`,
      [referenciaExterna],
    );
    return linhas[0] || null;
  },

  // Pedidos recentes do usuário que ainda não liberaram Premium. Usado para
  // reconciliar pagamentos aprovados cujo retorno ao site se perdeu.
  listarPedidosPendentes: async (usuarioId) => {
    const [linhas] = await pool.query(
      `SELECT referencia_externa
       FROM mp_pedidos
       WHERE usuario_id = ?
         AND acesso_concedido_em IS NULL
         AND preferencia_id IS NOT NULL
         AND estado <> 'failed'
         AND criado_em > UTC_TIMESTAMP() - INTERVAL 7 DAY
       ORDER BY id DESC
       LIMIT 10`,
      [usuarioId],
    );
    return linhas.map((linha) => linha.referencia_externa);
  },

  registrarPagamento: async (pedido, pagamento) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [pedidos] = await conn.query(
        `SELECT id, usuario_id, estado, acesso_concedido_em
         FROM mp_pedidos
         WHERE id = ?
         FOR UPDATE`,
        [pedido.id],
      );
      const pedidoAtual = pedidos[0];
      if (!pedidoAtual) {
        await conn.rollback();
        return false;
      }

      const [pagamentoExistente] = await conn.query(
        `SELECT pedido_id FROM mp_pagamentos
         WHERE mercadopago_id = ?
         LIMIT 1
         FOR UPDATE`,
        [pagamento.id],
      );
      if (
        pagamentoExistente[0] &&
        Number(pagamentoExistente[0].pedido_id) !== Number(pedidoAtual.id)
      ) {
        await conn.rollback();
        return false;
      }

      await conn.query(
        `INSERT INTO mp_pagamentos
           (pedido_id, mercadopago_id, status, valor, moeda, modo_teste,
            aprovado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           valor = VALUES(valor),
           moeda = VALUES(moeda),
           modo_teste = VALUES(modo_teste),
           aprovado_em = VALUES(aprovado_em),
           atualizado_em = UTC_TIMESTAMP()`,
        [
          pedidoAtual.id,
          pagamento.id,
          pagamento.status,
          pagamento.transaction_amount,
          pagamento.currency_id,
          pagamento.live_mode ? 0 : 1,
          pagamentoAprovado(pagamento.status) ? new Date() : null,
        ],
      );

      const [pagamentoRegistrado] = await conn.query(
        `SELECT pedido_id FROM mp_pagamentos
         WHERE mercadopago_id = ?
         LIMIT 1
         FOR UPDATE`,
        [pagamento.id],
      );
      if (
        !pagamentoRegistrado[0] ||
        Number(pagamentoRegistrado[0].pedido_id) !== Number(pedidoAtual.id)
      ) {
        await conn.rollback();
        return false;
      }

      if (
        pagamentoAprovado(pagamento.status) &&
        !pedidoAtual.acesso_concedido_em
      ) {
        const [atualizacaoUsuario] = await conn.query(
          `UPDATE usuarios
           SET premium_ate = DATE_ADD(
                 GREATEST(COALESCE(premium_ate, UTC_TIMESTAMP()), UTC_TIMESTAMP()),
                 INTERVAL 30 DAY
               ),
               plano = 'premium',
               assinatura_atualizada_em = UTC_TIMESTAMP()
           WHERE id = ?`,
          [pedidoAtual.usuario_id],
        );
        if (atualizacaoUsuario.affectedRows !== 1) {
          throw new Error("A conta vinculada ao pedido não existe.");
        }

        const [usuarios] = await conn.query(
          "SELECT premium_ate FROM usuarios WHERE id = ?",
          [pedidoAtual.usuario_id],
        );
        await conn.query(
          `UPDATE mp_pedidos
           SET estado = 'approved',
               pagamento_aprovado_id = ?,
               acesso_concedido_em = UTC_TIMESTAMP(),
               premium_ate = ?,
               atualizado_em = UTC_TIMESTAMP()
           WHERE id = ?`,
          [pagamento.id, usuarios[0].premium_ate, pedidoAtual.id],
        );
      } else if (!pedidoAtual.acesso_concedido_em) {
        await conn.query(
          `UPDATE mp_pedidos
           SET estado = ?, atualizado_em = UTC_TIMESTAMP()
           WHERE id = ?`,
          [pagamento.status, pedidoAtual.id],
        );
      }

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};

module.exports = { pagamentoMercadoPagoModel };
