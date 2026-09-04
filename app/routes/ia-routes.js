const express = require("express");
const router = express.Router();

const { responderChat } = require("../services/iaService");
const { usuarioModel } = require("../models/Usuario");
const { tarefaModel } = require("../models/Tarefa");

function apenasAutenticado(req, res, next) {
  if (!req.session?.usuario)
    return res.status(401).json({ erro: "Não autenticado" });
  next();
}

router.post("/chat", apenasAutenticado, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ erro: "GEMINI_API_KEY não configurada." });
    }

    const mensagem = String(req.body.mensagem || "").trim();
    if (!mensagem) {
      return res.status(400).json({ erro: "Mensagem não pode ficar vazia." });
    }

    const usuarioId = req.session.usuario.id;
    const [usuario, tarefas] = await Promise.all([
      usuarioModel.buscarPorId(usuarioId),
      tarefaModel.listarPorUsuario(usuarioId),
    ]);

    let perfil = null;
    if (usuario?.perfil_pesquisa) {
      try {
        perfil =
          typeof usuario.perfil_pesquisa === "string"
            ? JSON.parse(usuario.perfil_pesquisa)
            : usuario.perfil_pesquisa;
      } catch (_) {
        perfil = null;
      }
    }

    const resposta = await responderChat({ mensagem, usuario, tarefas, perfil });

    res.json({ resposta });
  } catch (err) {
    console.error("[IA]", err?.message || err);
    res.status(500).json({ erro: err?.message || "Erro na IA" });
  }
});

module.exports = router;
