```sql
-- ============================================================
-- HEALTHY SAFELY - SCHEMA DO BANCO
-- ============================================================
-- Para criar o banco:
-- mysql -u root -p < app/database/schema.sql
--
-- Este arquivo representa o ESTADO ATUAL/FNAL do banco.
-- Não contém mais estruturas de profissionais, amizades etc.
-- ============================================================
```

-- ── USUÁRIOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  nome                  VARCHAR(100) NOT NULL,
  nomeusuario           VARCHAR(50) UNIQUE,
  email                 VARCHAR(150) NOT NULL UNIQUE,
  senha                 CHAR(60) NOT NULL,
  foto_perfil           VARCHAR(255) DEFAULT NULL,
  criado_em             DATETIME DEFAULT CURRENT_TIMESTAMP,
  onboarding_concluido  TINYINT(1) DEFAULT 0,
  perfil_pesquisa       JSON DEFAULT NULL
);


-- ── TOKENS DE RECUPERAÇÃO DE SENHA ─────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150) NOT NULL,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expira_em  DATETIME NOT NULL,
  criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_reset_email (email),
  INDEX idx_reset_expira (expira_em)
);


-- ── CREDENCIAIS WEBAUTHN / PASSKEY ─────────────────────────
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL,
  credential_id VARCHAR(255) NOT NULL UNIQUE,
  public_key    TEXT NOT NULL,
  counter      INT DEFAULT 0,
  criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
);


-- ── TAREFAS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tarefas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL,
  titulo        VARCHAR(200) NOT NULL,
  descricao     TEXT DEFAULT NULL,
  concluida     TINYINT(1) DEFAULT 0,
  concluida_em  DATETIME DEFAULT NULL,
  data          DATE DEFAULT NULL,
  horario       TIME DEFAULT NULL,
  repeticao     ENUM('once','daily','weekly') DEFAULT 'once',
  dia_semana    ENUM(
    'domingo',
    'segunda',
    'terca',
    'quarta',
    'quinta',
    'sexta',
    'sabado'
  ) DEFAULT NULL,
  categoria     ENUM(
    'saude',
    'sono',
    'alimentacao',
    'exercicio',
    'geral'
  ) DEFAULT 'geral',
  criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
);


-- ── TAREFAS PADRÃO ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tarefas_padrao (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  titulo    VARCHAR(200) NOT NULL,
  categoria ENUM(
    'saude',
    'sono',
    'alimentacao',
    'exercicio',
    'geral'
  ) DEFAULT 'geral'
);


-- Seeds das tarefas padrão
INSERT IGNORE INTO tarefas_padrao (id, titulo, categoria) VALUES
  (1, 'Beber água (2L)',                  'saude'),
  (2, 'Dormir bem (8h)',                  'sono'),
  (3, 'Fazer exercício físico',           'exercicio'),
  (4, 'Comer frutas e vegetais',          'alimentacao'),
  (5, 'Meditar por 10 minutos',           'saude'),
  (6, 'Evitar telas 1h antes de dormir', 'sono'),
  (7, 'Caminhar 30 minutos',              'exercicio');


-- ── NOTIFICAÇÕES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacoes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  mensagem   VARCHAR(500) NOT NULL,
  lida       TINYINT(1) DEFAULT 0,
  criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
);


-- ── REGISTROS DE SONO ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros_sono (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id     INT NOT NULL,
  horas_dormidas DECIMAL(4,1) NOT NULL,
  qualidade      TINYINT DEFAULT 3,
  data           DATE DEFAULT (CURDATE()),

  UNIQUE KEY uk_sono_dia (usuario_id, data),

  FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
);


-- ── WEB PUSH: ASSINATURAS DOS DISPOSITIVOS ────────────────
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


-- ── WEB PUSH: CONTROLE DE ENVIOS ──────────────────────────
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


-- ── SUPORTE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suporte (
  id             INT NOT NULL AUTO_INCREMENT,
  usuario_id     INT NULL,
  nome           VARCHAR(100) NOT NULL DEFAULT '',
  email          VARCHAR(150) NOT NULL DEFAULT '',
  assunto        VARCHAR(255) NOT NULL,
  tipo           VARCHAR(80) NOT NULL DEFAULT 'Geral',
  mensagem       TEXT NOT NULL,
  status         ENUM(
    'pendente',
    'respondido',
    'resolvido'
  ) NOT NULL DEFAULT 'pendente',
  resposta       TEXT NULL,
  criado_em      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  respondido_em  TIMESTAMP NULL DEFAULT NULL,
  atualizado_em  DATETIME DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  INDEX idx_suporte_usuario (usuario_id),
  INDEX idx_suporte_status (status),
  INDEX idx_suporte_criado_em (criado_em)
);
