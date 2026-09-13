```sql
-- ─────────────────────────────────────────────────────────────
-- HEALTHY SAFELY
-- atualizar-banco.sql
--
-- Atualiza um banco existente sem apagar dados dos usuários.
--
-- Execute:
-- mysql -u root -p healthy_safely < app/database/atualizar-banco.sql
--
-- ATENÇÃO:
-- Este arquivo remove apenas estruturas antigas do sistema
-- de profissionais/amizades que não fazem mais parte do projeto.
-- ─────────────────────────────────────────────────────────────
```
USE healthy_safely;


-- ─────────────────────────────────────────────────────────────
-- USUÁRIOS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS onboarding_concluido TINYINT(1) DEFAULT 0;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS perfil_pesquisa JSON DEFAULT NULL;

ALTER TABLE usuarios
  MODIFY COLUMN senha CHAR(60) NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- REMOÇÃO DO SISTEMA ANTIGO
-- ─────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────
-- TAREFAS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS concluida_em DATETIME DEFAULT NULL;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS data DATE DEFAULT NULL;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS horario TIME DEFAULT NULL;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS repeticao
    ENUM('once','daily','weekly')
    DEFAULT 'once';

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS dia_semana
    ENUM(
      'domingo',
      'segunda',
      'terca',
      'quarta',
      'quinta',
      'sexta',
      'sabado'
    )
    DEFAULT NULL;


-- ─────────────────────────────────────────────────────────────
-- WEBAUTHN / PASSKEY
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL,
  credential_id VARCHAR(255) NOT NULL UNIQUE,
  public_key    TEXT NOT NULL,
  counter       INT DEFAULT 0,
  criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
);


-- ─────────────────────────────────────────────────────────────
-- WEB PUSH
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  endpoint   VARCHAR(500) NOT NULL,
  p256dh     VARCHAR(255) NOT NULL,
  auth       VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_push_endpoint (endpoint(191)),

  FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS push_notificacoes_enviadas (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  tarefa_id  INT NOT NULL,
  usuario_id INT NOT NULL,
  referencia DATE NOT NULL,
  criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_envio_ocorrencia (tarefa_id, referencia),

  FOREIGN KEY (tarefa_id)
    REFERENCES tarefas(id)
    ON DELETE CASCADE,

  FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
);


-- ─────────────────────────────────────────────────────────────
-- SUPORTE
-- ─────────────────────────────────────────────────────────────
--
-- A tabela suporte pode já existir no banco.
-- Por isso, primeiro garantimos a criação da estrutura base.
--

CREATE TABLE IF NOT EXISTS suporte (
  id             INT NOT NULL AUTO_INCREMENT,
  usuario_id     INT NULL,
  assunto        VARCHAR(255) NOT NULL,
  mensagem       TEXT NOT NULL,
  status         ENUM(
    'pendente',
    'respondido',
    'resolvido'
  ) NOT NULL DEFAULT 'pendente',
  resposta       TEXT NULL,
  criado_em      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  respondido_em  TIMESTAMP NULL DEFAULT NULL,

  PRIMARY KEY (id),

  INDEX idx_suporte_usuario (usuario_id),
  INDEX idx_suporte_status (status),
  INDEX idx_suporte_criado_em (criado_em)
);


-- ─────────────────────────────────────────────────────────────
-- NOVOS CAMPOS DO SUPORTE
-- ─────────────────────────────────────────────────────────────

ALTER TABLE suporte
  ADD COLUMN IF NOT EXISTS nome VARCHAR(100) NOT NULL DEFAULT '';

ALTER TABLE suporte
  ADD COLUMN IF NOT EXISTS email VARCHAR(150) NOT NULL DEFAULT '';

ALTER TABLE suporte
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(80) NOT NULL DEFAULT 'Geral';

ALTER TABLE suporte
  ADD COLUMN IF NOT EXISTS atualizado_em DATETIME
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP;


-- ─────────────────────────────────────────────────────────────
-- VERIFICAÇÃO
-- ─────────────────────────────────────────────────────────────

SELECT CONCAT(
  '✅ Banco atualizado! Usuários: ',
  COUNT(*)
) AS status
FROM usuarios;
