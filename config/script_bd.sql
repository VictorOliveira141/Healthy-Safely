-- mysql -u root -p < app/database/schema.sql


-- ── USUÁRIOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id           INT          AUTO_INCREMENT PRIMARY KEY,
  nome         VARCHAR(100) NOT NULL,
  nomeusuario  VARCHAR(50)  UNIQUE,
  email        VARCHAR(150) NOT NULL UNIQUE,
  senha        VARCHAR(255) NOT NULL,   -- bcrypt hash
  tipo         ENUM('cliente','profissional') NOT NULL DEFAULT 'cliente',
  nivel        VARCHAR(50)  DEFAULT 'iniciante',
  pontos       INT          DEFAULT 0,
  foto_perfil  VARCHAR(255) DEFAULT NULL,
  criado_em    DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ── TOKENS DE RECUPERAÇÃO DE SENHA ──────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150) NOT NULL,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expira_em  DATETIME NOT NULL,
  criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reset_email (email),
  INDEX idx_reset_expira (expira_em)
);

-- ── PROFISSIONAIS (dados extras) ─────────────────────────────
CREATE TABLE IF NOT EXISTS profissionais (
  id                INT  AUTO_INCREMENT PRIMARY KEY,
  usuario_id        INT  NOT NULL UNIQUE,
  cref              VARCHAR(30)  DEFAULT NULL,
  area_atuacao      VARCHAR(100) DEFAULT NULL,
  tempo_experiencia INT          DEFAULT 0,
  especialidades    TEXT         DEFAULT NULL,
  disponivel        TINYINT(1)   DEFAULT 1,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── TAREFAS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tarefas (
  id            INT  AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT  NOT NULL,
  criado_por    INT  DEFAULT NULL,   -- profissional que criou (NULL = o proprio usuario)
  titulo        VARCHAR(200) NOT NULL,
  descricao     TEXT         DEFAULT NULL,
  pontos        INT          DEFAULT 10,
  concluida     TINYINT(1)   DEFAULT 0,
  concluida_em  DATETIME     DEFAULT NULL,
  data          DATE         DEFAULT NULL,
  horario       TIME         DEFAULT NULL,
  repeticao     ENUM('once','daily','weekly') DEFAULT 'once',
  dia_semana    ENUM('domingo','segunda','terca','quarta','quinta','sexta','sabado') DEFAULT NULL,
  categoria     ENUM('saude','sono','alimentacao','exercicio','geral') DEFAULT 'geral',
  criado_em     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ── TAREFAS PADRÃO (seed p/ novos clientes) ──────────────────
CREATE TABLE IF NOT EXISTS tarefas_padrao (
  id        INT  AUTO_INCREMENT PRIMARY KEY,
  titulo    VARCHAR(200) NOT NULL,
  pontos    INT  DEFAULT 10,
  categoria ENUM('saude','sono','alimentacao','exercicio','geral') DEFAULT 'geral'
);

INSERT IGNORE INTO tarefas_padrao (id, titulo, pontos, categoria) VALUES
  (1,'Beber água (2L)',                 10,'saude'),
  (2,'Dormir bem (8h)',                 15,'sono'),
  (3,'Fazer exercício físico',          20,'exercicio'),
  (4,'Comer frutas e vegetais',         10,'alimentacao'),
  (5,'Meditar por 10 minutos',          15,'saude'),
  (6,'Evitar telas 1h antes de dormir',10,'sono'),
  (7,'Caminhar 30 minutos',            15,'exercicio');

-- ── VÍNCULOS paciente ↔ profissional ────────────────────────
CREATE TABLE IF NOT EXISTS vinculos (
  id               INT  AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT  NOT NULL,
  profissional_id  INT  NOT NULL,
  status           ENUM('pendente','ativo','recusado','encerrado') DEFAULT 'pendente',
  criado_em        DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_vinculo (paciente_id, profissional_id),
  FOREIGN KEY (paciente_id)     REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── SOLICITAÇÕES de troca de profissional ────────────────────
CREATE TABLE IF NOT EXISTS solicitacoes (
  id               INT  AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT  NOT NULL,
  profissional_id  INT  NOT NULL,   -- profissional solicitado
  tipo             ENUM('vinculo','troca') DEFAULT 'vinculo',
  status           ENUM('pendente','aprovada','rejeitada') DEFAULT 'pendente',
  mensagem         TEXT DEFAULT NULL,
  criado_em        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id)     REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── NOTIFICAÇÕES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacoes (
  id         INT  AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT  NOT NULL,
  mensagem   VARCHAR(500) NOT NULL,
  lida       TINYINT(1)   DEFAULT 0,
  criado_em  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── SONO ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros_sono (
  id             INT  AUTO_INCREMENT PRIMARY KEY,
  usuario_id     INT  NOT NULL,
  horas_dormidas DECIMAL(4,1) NOT NULL,
  qualidade      TINYINT DEFAULT 3,
  data           DATE    DEFAULT (CURDATE()),
  UNIQUE KEY uk_sono_dia (usuario_id, data),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── AMIZADES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS amizades (
  id             INT  AUTO_INCREMENT PRIMARY KEY,
  solicitante_id INT  NOT NULL,
  receptor_id    INT  NOT NULL,
  status         ENUM('pendente','aceita','recusada') DEFAULT 'pendente',
  criado_em      DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unico_par (solicitante_id, receptor_id),
  FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (receptor_id)    REFERENCES usuarios(id) ON DELETE CASCADE
);
