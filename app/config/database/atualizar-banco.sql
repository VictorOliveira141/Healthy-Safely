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

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS concluida_em DATETIME DEFAULT NULL;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS criado_por INT DEFAULT NULL;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS data DATE DEFAULT NULL;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS horario TIME DEFAULT NULL;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS repeticao ENUM('once','daily','weekly') DEFAULT 'once';

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS dia_semana ENUM('domingo','segunda','terca','quarta','quinta','sexta','sabado') DEFAULT NULL;

ALTER TABLE profissionais
  ADD COLUMN IF NOT EXISTS disponivel TINYINT(1) DEFAULT 1;

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

CREATE TABLE IF NOT EXISTS solicitacoes (
  id               INT  AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT  NOT NULL,
  profissional_id  INT  NOT NULL,
  tipo             ENUM('vinculo','troca') DEFAULT 'vinculo',
  status           ENUM('pendente','aprovada','rejeitada') DEFAULT 'pendente',
  mensagem         TEXT DEFAULT NULL,
  criado_em        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id)     REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

INSERT IGNORE INTO tarefas_padrao (id, titulo, pontos, categoria) VALUES
  (1,'Beber água (2L)',                  10,'saude'),
  (2,'Dormir bem (8h)',                  15,'sono'),
  (3,'Fazer exercício físico',           20,'exercicio'),
  (4,'Comer frutas e vegetais',          10,'alimentacao'),
  (5,'Meditar por 10 minutos',           15,'saude'),
  (6,'Evitar telas 1h antes de dormir', 10,'sono'),
  (7,'Caminhar 30 minutos',             15,'exercicio');

SELECT CONCAT('✅ Banco atualizado! Usuários: ', COUNT(*)) AS status FROM usuarios;
