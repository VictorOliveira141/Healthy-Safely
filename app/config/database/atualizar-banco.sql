-- ─────────────────────────────────────────────────
-- atualizar-banco.sql
-- Execute UMA VEZ para atualizar o banco sem perder dados:
--   mysql -u root -p healthy_safely < app/database/atualizar-banco.sql
-- ─────────────────────────────────────────────────

USE healthy_safely;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS onboarding_concluido TINYINT(1) DEFAULT 0;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS perfil_pesquisa JSON DEFAULT NULL;

DROP TABLE IF EXISTS solicitacoes;
DROP TABLE IF EXISTS vinculos;
DROP TABLE IF EXISTS profissionais;
DROP TABLE IF EXISTS amizades;

ALTER TABLE usuarios
  DROP COLUMN IF EXISTS tipo,
  DROP COLUMN IF EXISTS nivel,
  DROP COLUMN IF EXISTS pontos;

ALTER TABLE tarefas
  DROP COLUMN IF EXISTS criado_por,
  DROP COLUMN IF EXISTS pontos;

ALTER TABLE tarefas_padrao
  DROP COLUMN IF EXISTS pontos;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS concluida_em DATETIME DEFAULT NULL;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS data DATE DEFAULT NULL;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS horario TIME DEFAULT NULL;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS repeticao ENUM('once','daily','weekly') DEFAULT 'once';

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS dia_semana ENUM('domingo','segunda','terca','quarta','quinta','sexta','sabado') DEFAULT NULL;

CREATE TABLE webauthn_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    credential_id VARCHAR(255) NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INT DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);

-- ── WEB PUSH (novo) ────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  endpoint   VARCHAR(500) NOT NULL,
  p256dh     VARCHAR(255) NOT NULL,
  auth       VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_push_endpoint (endpoint(191)),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS push_notificacoes_enviadas (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  tarefa_id  INT NOT NULL,
  usuario_id INT NOT NULL,
  referencia DATE NOT NULL,
  criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_envio_ocorrencia (tarefa_id, referencia),
  FOREIGN KEY (tarefa_id)  REFERENCES tarefas(id)  ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

SELECT CONCAT('✅ Banco atualizado! Usuários: ', COUNT(*)) AS status FROM usuarios;