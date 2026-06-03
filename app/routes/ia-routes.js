const express = require("express");
const router = express.Router();

const OpenAI = require("openai");

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "AVISO: OPENAI_API_KEY não definido. A rota de IA não funcionará sem a chave.",
  );
}

let client = null;
function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// proteção opcional (mesma lógica do seu sistema)
function apenasCliente(req, res, next) {
  if (!req.session?.usuario)
    return res.status(401).json({ erro: "Não autenticado" });
  if (req.session.usuario.tipo !== "cliente")
    return res.status(403).json({ erro: "Acesso negado" });
  next();
}

router.post("/chat", apenasCliente, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ erro: "OPENAI_API_KEY não configurada." });
    }

    const mensagem = String(req.body.mensagem || "").trim();
    if (!mensagem) {
      return res.status(400).json({ erro: "Mensagem não pode ficar vazia." });
    }

    const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const client = getClient();

    const response = await client.responses.create({
      model: modelName,
      input: [
        {
          role: "system",
          content: `
Você é o "Healthy AI".

Você é um assistente especializado SOMENTE em:
- saúde
- hábitos saudáveis
- produtividade
- organização de rotina
- metas pessoais
- bem-estar leve

REGRAS:
- Não responda nada fora disso
- Se o usuário fugir do tema, diga:
  "Posso te ajudar apenas com saúde, hábitos e produtividade."
- Respostas curtas, práticas e motivacionais
- Nunca dar diagnósticos médicos
- Sempre sugerir ações práticas simples
          `,
        },
        {
          role: "user",
          content: mensagem,
        },
      ],
    });

    const resposta =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      response.output?.[0]?.text ||
      "Desculpe, não consegui gerar uma resposta.";

    res.json({ resposta });
  } catch (err) {
    console.error("[IA]", err?.message || err);
    const erro =
      err?.response?.data?.error?.message || err?.message || "Erro na IA";
    res.status(500).json({ erro });
  }
});

module.exports = router;
