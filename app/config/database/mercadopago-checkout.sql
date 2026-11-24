-- Migração aditiva do Checkout Pro em Sandbox.
-- Não executa os DROP TABLE existentes em atualizar-banco.sql.
-- Execute no banco alvo:
-- mysql -u root -p NOME_DO_BANCO < app/config/database/mercadopago-checkout.sql

-- MySQL não aceita ADD COLUMN IF NOT EXISTS. Verifica antes para permitir
-- executar a migração também em um banco criado pelo schema.sql atualizado.
SET @mp_premium_ate_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'premium_ate'
);

SET @mp_premium_ate_ddl = IF(
  @mp_premium_ate_exists = 0,
  'ALTER TABLE usuarios ADD COLUMN premium_ate DATETIME DEFAULT NULL',
  'SELECT 1'
);

PREPARE mp_premium_ate_stmt FROM @mp_premium_ate_ddl;
EXECUTE mp_premium_ate_stmt;
DEALLOCATE PREPARE mp_premium_ate_stmt;

CREATE TABLE IF NOT EXISTS mp_pedidos (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id            INT NOT NULL,
  referencia_externa    CHAR(36) NOT NULL,
  preferencia_id        VARCHAR(64) DEFAULT NULL,
  pagamento_aprovado_id VARCHAR(64) DEFAULT NULL,
  valor                 DECIMAL(10,2) NOT NULL,
  moeda                 CHAR(3) NOT NULL,
  estado                VARCHAR(32) NOT NULL DEFAULT 'pending',
  acesso_concedido_em   DATETIME DEFAULT NULL,
  premium_ate            DATETIME DEFAULT NULL,
  criado_em             DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em         DATETIME DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_mp_pedido_referencia (referencia_externa),
  UNIQUE KEY uq_mp_pedido_preferencia (preferencia_id),
  UNIQUE KEY uq_mp_pedido_pagamento_aprovado (pagamento_aprovado_id),
  INDEX idx_mp_pedidos_usuario (usuario_id, criado_em),

  FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mp_pagamentos (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  pedido_id      BIGINT NOT NULL,
  mercadopago_id VARCHAR(64) NOT NULL,
  status         VARCHAR(32) NOT NULL,
  valor          DECIMAL(10,2) NOT NULL,
  moeda          CHAR(3) NOT NULL,
  modo_teste     TINYINT(1) NOT NULL,
  aprovado_em    DATETIME DEFAULT NULL,
  criado_em      DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_mp_pagamento_id (mercadopago_id),
  INDEX idx_mp_pagamentos_pedido (pedido_id),

  FOREIGN KEY (pedido_id)
    REFERENCES mp_pedidos(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
