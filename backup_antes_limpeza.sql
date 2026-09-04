-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: bttp8pp6hd5lnrqz9vb2-mysql.services.clever-cloud.com    Database: bttp8pp6hd5lnrqz9vb2
-- ------------------------------------------------------
-- Server version	8.0.22-13

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `amizades`
--

DROP TABLE IF EXISTS `amizades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `amizades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `solicitante_id` int NOT NULL,
  `receptor_id` int NOT NULL,
  `status` enum('pendente','aceita','recusada') DEFAULT 'pendente',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unico_par` (`solicitante_id`,`receptor_id`),
  KEY `receptor_id` (`receptor_id`),
  CONSTRAINT `amizades_ibfk_1` FOREIGN KEY (`solicitante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `amizades_ibfk_2` FOREIGN KEY (`receptor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `amizades`
--

LOCK TABLES `amizades` WRITE;
/*!40000 ALTER TABLE `amizades` DISABLE KEYS */;
/*!40000 ALTER TABLE `amizades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificacoes`
--

DROP TABLE IF EXISTS `notificacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificacoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `mensagem` varchar(500) NOT NULL,
  `lida` tinyint(1) DEFAULT '0',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `notificacoes_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificacoes`
--

LOCK TABLES `notificacoes` WRITE;
/*!40000 ALTER TABLE `notificacoes` DISABLE KEYS */;
INSERT INTO `notificacoes` VALUES (45,75,'Tarefa concluída: Dormir bem (8h)',0,'2026-07-26 17:35:09'),(46,75,'Tarefa concluída: Beber água (2L)',0,'2026-07-26 17:35:36'),(47,75,'Tarefa concluída: Fazer exercício físico',0,'2026-07-26 17:35:43'),(48,75,'Tarefa concluída: Comer frutas e vegetais',0,'2026-07-26 17:35:47'),(49,75,'Tarefa concluída: Meditar por 10 minutos',0,'2026-07-26 17:35:50'),(50,75,'Tarefa concluída: Evitar telas 1h antes de dormir',0,'2026-07-26 17:35:54'),(51,75,'Tarefa concluída: Caminhar 30 minutos',0,'2026-07-26 17:35:57'),(62,89,'Tarefa concluída: Teste dashboard',0,'2026-09-04 00:32:17');
/*!40000 ALTER TABLE `notificacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(150) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expira_em` datetime NOT NULL,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_reset_email` (`email`),
  KEY `idx_reset_expira` (`expira_em`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (39,'vh69499437@gmail.com','00d687acb8d746ead2906a20a4b7587fc944575a3d36ea02679dc2c430b062fa','2026-08-26 23:50:28','2026-08-26 22:50:28'),(43,'mateusandre0511@gmail.com','07fb28338014136df81f2d42481a76186079c3371c4f94d8bba6d7628e8db960','2026-08-27 11:51:42','2026-08-27 10:51:42');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profissionais`
--

DROP TABLE IF EXISTS `profissionais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profissionais` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `cref` varchar(30) DEFAULT NULL,
  `area_atuacao` varchar(100) DEFAULT NULL,
  `tempo_experiencia` int DEFAULT '0',
  `especialidades` text,
  `disponivel` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `profissionais_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profissionais`
--

LOCK TABLES `profissionais` WRITE;
/*!40000 ALTER TABLE `profissionais` DISABLE KEYS */;
INSERT INTO `profissionais` VALUES (7,24,'12345-G/SP','nutricao',12,'Nutrição',1);
/*!40000 ALTER TABLE `profissionais` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `push_notificacoes_enviadas`
--

DROP TABLE IF EXISTS `push_notificacoes_enviadas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `push_notificacoes_enviadas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tarefa_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `referencia` date NOT NULL,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_envio_ocorrencia` (`tarefa_id`,`referencia`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `push_notificacoes_enviadas_ibfk_1` FOREIGN KEY (`tarefa_id`) REFERENCES `tarefas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `push_notificacoes_enviadas_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `push_notificacoes_enviadas`
--

LOCK TABLES `push_notificacoes_enviadas` WRITE;
/*!40000 ALTER TABLE `push_notificacoes_enviadas` DISABLE KEYS */;
INSERT INTO `push_notificacoes_enviadas` VALUES (6,453,75,'2026-09-01','2026-09-01 22:40:06');
/*!40000 ALTER TABLE `push_notificacoes_enviadas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `push_subscriptions`
--

DROP TABLE IF EXISTS `push_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `endpoint` varchar(500) NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_push_endpoint` (`endpoint`(191)),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `push_subscriptions`
--

LOCK TABLES `push_subscriptions` WRITE;
/*!40000 ALTER TABLE `push_subscriptions` DISABLE KEYS */;
INSERT INTO `push_subscriptions` VALUES (1,89,'https://fcm.googleapis.com/fcm/send/c0YLxVD1RyM:APA91bFu57nlCCPDX_nlyzuAqEJDuyIuiERwjCmjeTf949lAVbPvvQLGVZqp1lW8n6S6FpNBNVVFc8BIWE8noEU1Ru4A2Ji5dCEo6B69s23yzSndHn29lv5pjaFYqlAXA4UAtQcAM_vC','BD6RrZq29MjlQ8E3-bm1qcRey8dlMEp8oM4BTuTtNNb17t4fGIQWwieX47UZE0984_5_bJ6adUL9Rndedw-Gobg','-O0hErMV2DhdeT8nXnG-1Q','Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36','2026-09-01 22:18:05'),(2,89,'https://web.push.apple.com/QHyG-fVd7st9K4EWMs1n8oQZPeUCY1Vq72i6hynl9RpHo2iD1PSkVnIzlGl-7J82DV4DCfb4gn_ewDpDoUlnwnO0wqvCQOdg8ZFPilwcAYnaixqYewplks8eRiBvqTI_CCJG52WWAdfWT_42DVcRX9b3wKDsuyv9IoN9QCrPYaA','BGC6eMJ3S8j8brYzxZ_KJNbygb_szrGYs3e3CDZGXdAGX-y5UXWVHPnvqY2z2XJdC3mQEV3VPOchsCMk1RB2C_s','853cNzfIbG0_fby1sudG9w','Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1','2026-09-01 22:24:25'),(3,75,'https://web.push.apple.com/QO9r-5mhyiq8erA1u7nDB0QDZnpFl7OQWGNK6tLKSeFyGXpTplxdiR_0UNV4jxLVDUIkdVFmz4TtUFtqmb78ms4ZWeBcmkhWZ2Lm8B8J22RH3ypfv4vCQWEUvjt1ZzWydpR4wcrw1pDVxWaTNKQFiN-8ipEjT7R5P7fy3VoXtck','BPkZd0s9PA-AKfahKkiaLb2OZVV5FvRTJvAc-2za0ADDSGaUY4Jad5yGICSMMJrjjtkn8CP5v-WgwzRMENFyQZg','cYeUHUqx7qoFpPLpguzxXA','Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 Safari/604.1','2026-09-01 22:38:38');
/*!40000 ALTER TABLE `push_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registros_sono`
--

DROP TABLE IF EXISTS `registros_sono`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registros_sono` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `horas_dormidas` decimal(4,1) NOT NULL,
  `qualidade` tinyint DEFAULT '3',
  `data` date DEFAULT (curdate()),
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `registros_sono_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registros_sono`
--

LOCK TABLES `registros_sono` WRITE;
/*!40000 ALTER TABLE `registros_sono` DISABLE KEYS */;
/*!40000 ALTER TABLE `registros_sono` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitacoes`
--

DROP TABLE IF EXISTS `solicitacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitacoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `profissional_id` int NOT NULL,
  `tipo` enum('vinculo','troca') DEFAULT 'vinculo',
  `status` enum('pendente','aprovada','rejeitada') DEFAULT 'pendente',
  `mensagem` text,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  KEY `profissional_id` (`profissional_id`),
  CONSTRAINT `solicitacoes_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitacoes_ibfk_2` FOREIGN KEY (`profissional_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitacoes`
--

LOCK TABLES `solicitacoes` WRITE;
/*!40000 ALTER TABLE `solicitacoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `solicitacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tarefas`
--

DROP TABLE IF EXISTS `tarefas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tarefas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `descricao` text,
  `pontos` int DEFAULT '10',
  `concluida` tinyint(1) DEFAULT '0',
  `categoria` enum('saude','sono','alimentacao','exercicio','geral') DEFAULT 'geral',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `criado_por` int DEFAULT NULL,
  `concluida_em` datetime DEFAULT NULL,
  `data` date DEFAULT NULL,
  `horario` time DEFAULT NULL,
  `repeticao` enum('once','daily','weekly') DEFAULT 'once',
  `dia_semana` enum('domingo','segunda','terca','quarta','quinta','sexta','sabado') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `fk_criado_por` (`criado_por`),
  CONSTRAINT `fk_criado_por` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tarefas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=458 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tarefas`
--

LOCK TABLES `tarefas` WRITE;
/*!40000 ALTER TABLE `tarefas` DISABLE KEYS */;
INSERT INTO `tarefas` VALUES (322,75,'Beber água (2L)',NULL,10,1,'saude','2026-07-26 17:34:56',NULL,'2026-07-26 17:35:35',NULL,NULL,'once',NULL),(323,75,'Dormir bem (8h)',NULL,15,1,'sono','2026-07-26 17:34:56',NULL,'2026-07-26 17:35:08',NULL,NULL,'once',NULL),(324,75,'Fazer exercício físico',NULL,20,1,'exercicio','2026-07-26 17:34:56',NULL,'2026-07-26 17:35:43',NULL,NULL,'once',NULL),(325,75,'Comer frutas e vegetais',NULL,10,1,'alimentacao','2026-07-26 17:34:56',NULL,'2026-07-26 17:35:46',NULL,NULL,'once',NULL),(326,75,'Meditar por 10 minutos',NULL,15,1,'saude','2026-07-26 17:34:56',NULL,'2026-07-26 17:35:50',NULL,NULL,'once',NULL),(327,75,'Evitar telas 1h antes de dormir',NULL,10,1,'sono','2026-07-26 17:34:56',NULL,'2026-07-26 17:35:53',NULL,NULL,'once',NULL),(328,75,'Caminhar 30 minutos',NULL,15,1,'exercicio','2026-07-26 17:34:56',NULL,'2026-07-26 17:35:56',NULL,NULL,'once',NULL),(369,83,'Beber água (2L)',NULL,10,0,'saude','2026-08-25 11:44:58',NULL,NULL,NULL,NULL,'once',NULL),(370,83,'Dormir bem (8h)',NULL,15,0,'sono','2026-08-25 11:44:58',NULL,NULL,NULL,NULL,'once',NULL),(371,83,'Fazer exercício físico',NULL,20,0,'exercicio','2026-08-25 11:44:58',NULL,NULL,NULL,NULL,'once',NULL),(372,83,'Comer frutas e vegetais',NULL,10,0,'alimentacao','2026-08-25 11:44:58',NULL,NULL,NULL,NULL,'once',NULL),(373,83,'Meditar por 10 minutos',NULL,15,0,'saude','2026-08-25 11:44:58',NULL,NULL,NULL,NULL,'once',NULL),(374,83,'Evitar telas 1h antes de dormir',NULL,10,0,'sono','2026-08-25 11:44:58',NULL,NULL,NULL,NULL,'once',NULL),(375,83,'Caminhar 30 minutos',NULL,15,0,'exercicio','2026-08-25 11:44:58',NULL,NULL,NULL,NULL,'once',NULL),(398,24,'Organizar as tarefas do dia',NULL,10,0,'geral','2026-08-27 10:40:51',NULL,NULL,NULL,NULL,'once',NULL),(399,24,'Beber 2L de água',NULL,10,0,'saude','2026-08-27 10:40:51',NULL,NULL,NULL,NULL,'once',NULL),(400,24,'Fazer uma pausa de 10 minutos sem tela',NULL,10,0,'geral','2026-08-27 10:40:51',NULL,NULL,NULL,NULL,'once',NULL),(401,86,'Beber água (2L)',NULL,10,0,'saude','2026-08-27 10:49:24',NULL,NULL,NULL,NULL,'once',NULL),(402,86,'Dormir bem (8h)',NULL,15,0,'sono','2026-08-27 10:49:24',NULL,NULL,NULL,NULL,'once',NULL),(403,86,'Fazer exercício físico',NULL,20,0,'exercicio','2026-08-27 10:49:24',NULL,NULL,NULL,NULL,'once',NULL),(404,86,'Comer frutas e vegetais',NULL,10,0,'alimentacao','2026-08-27 10:49:24',NULL,NULL,NULL,NULL,'once',NULL),(405,86,'Meditar por 10 minutos',NULL,15,0,'saude','2026-08-27 10:49:24',NULL,NULL,NULL,NULL,'once',NULL),(406,86,'Evitar telas 1h antes de dormir',NULL,10,0,'sono','2026-08-27 10:49:24',NULL,NULL,NULL,NULL,'once',NULL),(407,86,'Caminhar 30 minutos',NULL,15,0,'exercicio','2026-08-27 10:49:24',NULL,NULL,NULL,NULL,'once',NULL),(408,86,'Organizar local de estudo sem distrações',NULL,10,0,'geral','2026-08-27 10:50:02',NULL,NULL,NULL,NULL,'once',NULL),(409,86,'Sessão de foco: 25 min de estudo à tarde',NULL,20,0,'geral','2026-08-27 10:50:02',NULL,NULL,NULL,NULL,'once',NULL),(410,86,'Fazer 5 min de alongamento na pausa do estudo',NULL,10,0,'exercicio','2026-08-27 10:50:02',NULL,NULL,NULL,NULL,'once',NULL),(411,86,'Beber 500ml de água durante o período de estudo',NULL,5,0,'saude','2026-08-27 10:50:03',NULL,NULL,NULL,NULL,'once',NULL),(423,88,'Beber água (2L)',NULL,10,0,'saude','2026-08-28 00:43:42',NULL,NULL,NULL,NULL,'once',NULL),(424,88,'Dormir bem (8h)',NULL,15,0,'sono','2026-08-28 00:43:42',NULL,NULL,NULL,NULL,'once',NULL),(425,88,'Fazer exercício físico',NULL,20,0,'exercicio','2026-08-28 00:43:42',NULL,NULL,NULL,NULL,'once',NULL),(426,88,'Comer frutas e vegetais',NULL,10,0,'alimentacao','2026-08-28 00:43:42',NULL,NULL,NULL,NULL,'once',NULL),(427,88,'Meditar por 10 minutos',NULL,15,0,'saude','2026-08-28 00:43:42',NULL,NULL,NULL,NULL,'once',NULL),(428,88,'Evitar telas 1h antes de dormir',NULL,10,0,'sono','2026-08-28 00:43:42',NULL,NULL,NULL,NULL,'once',NULL),(429,88,'Caminhar 30 minutos',NULL,15,0,'exercicio','2026-08-28 00:43:42',NULL,NULL,NULL,NULL,'once',NULL),(430,88,'Desconectar das telas 1h antes de dormir',NULL,20,0,'sono','2026-08-28 00:44:39',NULL,NULL,NULL,NULL,'once',NULL),(431,88,'Praticar 10 minutos de meditação guiada',NULL,15,0,'saude','2026-08-28 00:44:39',NULL,NULL,NULL,NULL,'once',NULL),(432,88,'Escrever 3 gratidões do dia em um diário',NULL,10,0,'geral','2026-08-28 00:44:39',NULL,NULL,NULL,NULL,'once',NULL),(433,88,'Fazer alongamento relaxante sem o celular',NULL,15,0,'exercicio','2026-08-28 00:44:39',NULL,NULL,NULL,NULL,'once',NULL),(449,75,'Fazer treino de 30 minutos à tarde',NULL,25,0,'exercicio','2026-09-01 22:37:40',NULL,NULL,NULL,NULL,'once',NULL),(450,75,'Comer um lanche leve pré-treino para dar energia',NULL,10,0,'alimentacao','2026-09-01 22:37:41',NULL,NULL,NULL,NULL,'once',NULL),(451,75,'Beber 2 litros de água durante o dia',NULL,15,0,'saude','2026-09-01 22:37:41',NULL,NULL,NULL,NULL,'once',NULL),(452,75,'Garantir 7 a 8 horas de sono à noite',NULL,20,0,'sono','2026-09-01 22:37:41',NULL,NULL,NULL,NULL,'once',NULL),(453,75,'teste','ce sabe',10,0,'geral','2026-09-01 22:39:52',NULL,NULL,'2026-09-01','19:40:00','once',NULL),(454,89,'Teste dashboard','teste',10,1,'geral','2026-09-04 00:31:28',NULL,'2026-09-04 00:32:16','2026-09-03','23:00:00','once',NULL),(456,89,'teste3',NULL,10,0,'exercicio','2026-09-04 00:46:18',NULL,NULL,'2026-09-03','23:00:00','once',NULL),(457,89,'teste4',NULL,10,0,'exercicio','2026-09-04 00:47:40',NULL,NULL,'2026-09-03','22:00:00','once',NULL);
/*!40000 ALTER TABLE `tarefas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tarefas_padrao`
--

DROP TABLE IF EXISTS `tarefas_padrao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tarefas_padrao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(200) NOT NULL,
  `pontos` int DEFAULT '10',
  `categoria` enum('saude','sono','alimentacao','exercicio','geral') DEFAULT 'geral',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tarefas_padrao`
--

LOCK TABLES `tarefas_padrao` WRITE;
/*!40000 ALTER TABLE `tarefas_padrao` DISABLE KEYS */;
INSERT INTO `tarefas_padrao` VALUES (1,'Beber água (2L)',10,'saude'),(2,'Dormir bem (8h)',15,'sono'),(3,'Fazer exercício físico',20,'exercicio'),(4,'Comer frutas e vegetais',10,'alimentacao'),(5,'Meditar por 10 minutos',15,'saude'),(6,'Evitar telas 1h antes de dormir',10,'sono'),(7,'Caminhar 30 minutos',15,'exercicio');
/*!40000 ALTER TABLE `tarefas_padrao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `nomeusuario` varchar(50) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `senha` char(60) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `tipo` enum('cliente','profissional') NOT NULL DEFAULT 'cliente',
  `nivel` varchar(50) DEFAULT 'iniciante',
  `pontos` int DEFAULT '0',
  `foto_perfil` varchar(255) DEFAULT NULL,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `onboarding_concluido` tinyint(1) DEFAULT '0',
  `perfil_pesquisa` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `nomeusuario` (`nomeusuario`)
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (24,'Iraldema Serra','Iraldema_fit','iraldemafit23@outlook.com','$2a$10$AuAsosigh4Usuc6z0L0P.uBTCuxVlMlIwl2IgUrRmH8AawMCvrL3e','profissional','profissional',0,NULL,'2026-04-21 21:53:41',1,'{\"dias\": [\"Seg\", \"Qua\", \"Sex\"], \"tempo\": \"1 hora\", \"periodo\": \"🔄 Horários variados\", \"objetivo\": \"📅 Criar rotina\", \"lembretes\": \"🤖 Deixar a IA decidir\", \"tarefasDia\": \"\", \"dificuldade\": \"📚 Falta de organização\"}'),(75,'Igor Andrade','igorfsh_','iguhandrade@gmail.com','$2a$10$LojgobWVjDivQYx8n4.CLudhIs9KazcJ8GC5PJuZi0sXrhTL1b/VO','cliente','iniciante',95,NULL,'2026-07-26 17:34:56',1,'{\"dias\": [\"Seg\", \"Qua\", \"Ter\", \"Qui\", \"Sex\"], \"tempo\": \"1 hora\", \"periodo\": \"☀️ Tarde\", \"objetivo\": \"💪 Exercícios\", \"lembretes\": \"🤖 Deixar a IA decidir\", \"tarefasDia\": \"\", \"dificuldade\": \"💤 Falta de energia\"}'),(83,'Mateus Felipe','rm94942','rm94942@estudante.fieb.edu.br','$2a$10$esb/w8h9qMPYGog7.Vp5Rex0r3Vah7UzZhud5TwKlEoa29sjwgqcC','cliente','iniciante',0,NULL,'2026-08-25 11:44:57',1,NULL),(86,'mateus felipe','mateus','mateusandre0511@gmail.com','$2a$10$VVDdXhYgMx0js26Z2W8RN.9WCPeC5A8l6.sEUo7PD9VRqS0NyTUka','cliente','iniciante',0,NULL,'2026-08-27 10:49:24',1,'{\"dias\": [\"Seg\", \"Qua\", \"Qui\", \"Sex\"], \"tempo\": \"1 hora\", \"periodo\": \"☀️ Tarde\", \"objetivo\": \"📚 Estudar\", \"lembretes\": \"4\", \"tarefasDia\": \"\", \"dificuldade\": \"😫 Procrastinação\"}'),(88,'Larissa','larissaoliiv','laricosta.2209@gmail.com','$2a$10$b2MP4KvprsD0IVkiGnutYerrQj4oZYZ7kihCHg1Z6ZpudkF3m5cda','cliente','iniciante',0,NULL,'2026-08-28 00:43:42',1,'{\"dias\": [\"Seg\", \"Ter\", \"Qua\", \"Qui\", \"Sex\", \"Sáb\", \"Dom\"], \"tempo\": \"Mais de 2 horas\", \"periodo\": \"🌙 Noite\", \"objetivo\": \"🧠 Saúde mental\", \"lembretes\": \"🤖 Deixar a IA decidir\", \"tarefasDia\": \"\", \"dificuldade\": \"📱 Muitas distrações\"}'),(89,'Victor','vth_oc','vhdacosta01@gmail.com','$2a$10$nr1jZasVlUbmLFR.65m7Z.CvmAartd53jL6/kSnG6V10MCOHaW3Xu','cliente','iniciante',10,'https://lh3.googleusercontent.com/a/ACg8ocLPaAn0lZ3AirFeAW5rK80W5kkf4-QJsG4P-jlgT5pTd95dYg=s96-c','2026-09-01 13:44:18',1,'{\"dias\": [\"Seg\", \"Ter\", \"Qua\", \"Qui\", \"Sex\"], \"tempo\": \"1 hora\", \"periodo\": \"🔄 Horários variados\", \"objetivo\": \"📅 Criar rotina\", \"lembretes\": \"3\", \"tarefasDia\": \"\", \"dificuldade\": \"😫 Procrastinação\"}');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vinculos`
--

DROP TABLE IF EXISTS `vinculos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vinculos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `profissional_id` int NOT NULL,
  `status` enum('pendente','ativo','recusado','encerrado') DEFAULT 'pendente',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_vinculo` (`paciente_id`,`profissional_id`),
  KEY `profissional_id` (`profissional_id`),
  CONSTRAINT `vinculos_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `vinculos_ibfk_2` FOREIGN KEY (`profissional_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vinculos`
--

LOCK TABLES `vinculos` WRITE;
/*!40000 ALTER TABLE `vinculos` DISABLE KEYS */;
/*!40000 ALTER TABLE `vinculos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webauthn_credentials`
--

DROP TABLE IF EXISTS `webauthn_credentials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webauthn_credentials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `credential_id` varchar(255) NOT NULL,
  `public_key` text NOT NULL,
  `counter` int DEFAULT '0',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `credential_id` (`credential_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `webauthn_credentials_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webauthn_credentials`
--

LOCK TABLES `webauthn_credentials` WRITE;
/*!40000 ALTER TABLE `webauthn_credentials` DISABLE KEYS */;
INSERT INTO `webauthn_credentials` VALUES (4,75,'0iAVvPXCT1aVoBykxr0vLLTrKJk','pQECAyYgASFYIJFFBP6sI2VZbL6fBmVU8BDViPQLNNXCFNoAEjsJ4H42IlggE/QDmdus2v3Xnsb5z6Q235MBLItRA1GTyS/UahDNWGM=',0,'2026-09-01 22:38:23');
/*!40000 ALTER TABLE `webauthn_credentials` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-04  1:14:05
