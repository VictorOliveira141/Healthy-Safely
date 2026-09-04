const { getClient, MODEL } = require("../config/geminiClient");

const CATEGORIAS_VALIDAS = [
  "saude",
  "sono",
  "alimentacao",
  "exercicio",
  "geral",
];

const PERSONA = `
Você é o "Healthy AI", assistente do app Healthy Safely.

Você é especializado SOMENTE em:
- saúde
- hábitos saudáveis
- produtividade
- organização de rotina
- metas pessoais
- bem-estar leve

REGRAS:
- Não responda nada fora desse escopo.
- Se o usuário fugir do tema, diga:
  "Posso te ajudar apenas com saúde, hábitos e produtividade."
- Respostas curtas, práticas e motivacionais.
- Nunca dar diagnósticos médicos.
- Sempre sugerir ações práticas simples.
- Use o contexto de perfil do usuário (quando fornecido) para personalizar a resposta.
`;

function montarContextoUsuario({ usuario, tarefas, perfil }) {
  if (!usuario) return "";

  const linhas = [
    `Nome: ${usuario.nome || "não informado"}`,
  ];

  if (perfil) {
    if (perfil.objetivo) linhas.push(`Objetivo principal: ${perfil.objetivo}`);
    if (perfil.dificuldade) linhas.push(`Maior dificuldade: ${perfil.dificuldade}`);
    if (perfil.tempo) linhas.push(`Tempo disponível por dia: ${perfil.tempo}`);
    if (perfil.periodo) linhas.push(`Período preferido: ${perfil.periodo}`);
  }

  if (Array.isArray(tarefas) && tarefas.length > 0) {
    const pendentes = tarefas
      .filter((t) => !t.concluida)
      .slice(0, 8)
      .map((t) => t.titulo);
    if (pendentes.length > 0) {
      linhas.push(`Tarefas pendentes: ${pendentes.join(", ")}`);
    }
  }

  return `\nCONTEXTO DO USUÁRIO:\n${linhas.join("\n")}\n`;
}

async function responderChat({ mensagem, usuario, tarefas, perfil }) {
  const client = getClient();
  if (!client) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  const systemInstruction = PERSONA + montarContextoUsuario({ usuario, tarefas, perfil });

  const response = await client.models.generateContent({
    model: MODEL,
    contents: mensagem,
    config: { systemInstruction },
  });

  return (
    response.text ||
    response.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Desculpe, não consegui gerar uma resposta."
  );
}

function tarefasFallback(respostas = {}) {
  const objetivo = String(respostas.objetivo || "").toLowerCase();

  if (objetivo.includes("exerc")) {
    return [
      { titulo: "Caminhar 20 minutos", categoria: "exercicio" },
      { titulo: "Fazer alongamento matinal", categoria: "exercicio" },
      { titulo: "Beber 2L de água", categoria: "saude" },
    ];
  }
  if (objetivo.includes("alimenta")) {
    return [
      { titulo: "Comer frutas e vegetais", categoria: "alimentacao" },
      { titulo: "Planejar as refeições do dia", categoria: "alimentacao" },
      { titulo: "Beber 2L de água", categoria: "saude" },
    ];
  }
  if (objetivo.includes("dormir")) {
    return [
      { titulo: "Evitar telas 1h antes de dormir", categoria: "sono" },
      { titulo: "Definir horário fixo para dormir", categoria: "sono" },
    ];
  }
  if (objetivo.includes("mental")) {
    return [
      { titulo: "Meditar por 10 minutos", categoria: "saude" },
      { titulo: "Escrever 3 coisas boas do dia", categoria: "saude" },
    ];
  }

  return [
    { titulo: "Organizar as tarefas do dia", categoria: "geral" },
    { titulo: "Beber 2L de água", categoria: "saude" },
    { titulo: "Fazer uma pausa de 10 minutos sem tela", categoria: "geral" },
  ];
}

function sanitizarTarefas(lista) {
  if (!Array.isArray(lista)) return null;

  const limpas = lista
    .filter((t) => t && typeof t.titulo === "string" && t.titulo.trim())
    .slice(0, 6)
    .map((t) => ({
      titulo: t.titulo.trim().slice(0, 200),
      categoria: CATEGORIAS_VALIDAS.includes(t.categoria) ? t.categoria : "geral",
    }));

  return limpas.length > 0 ? limpas : null;
}

async function gerarTarefasPersonalizadas(respostas = {}) {
  const client = getClient();
  if (!client) {
    return tarefasFallback(respostas);
  }

  const prompt = `
Com base nas respostas de um questionário de um novo usuário do app Healthy Safely,
gere de 3 a 5 tarefas diárias personalizadas para ajudá-lo a alcançar seu objetivo.

Respostas do usuário:
- Objetivo principal: ${respostas.objetivo || "não informado"}
- Maior dificuldade: ${respostas.dificuldade || "não informado"}
- Tempo disponível por dia: ${respostas.tempo || "não informado"}
- Período preferido: ${respostas.periodo || "não informado"}
- Dias disponíveis: ${(respostas.dias || []).join(", ") || "não informado"}
- Quantidade de tarefas desejadas por dia: ${respostas.tarefasDia || "não informado"}

Cada tarefa deve ter: titulo (curto, em português, prático) e categoria (uma de: saude, sono, alimentacao, exercicio, geral).
`;

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: PERSONA,
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              categoria: { type: "string" },
            },
            required: ["titulo", "categoria"],
          },
        },
      },
    });

    const texto = response.text || "[]";
    const tarefas = sanitizarTarefas(JSON.parse(texto));
    return tarefas || tarefasFallback(respostas);
  } catch (err) {
    console.error("[IA] Erro ao gerar tarefas personalizadas:", err?.message || err);
    return tarefasFallback(respostas);
  }
}

module.exports = { responderChat, gerarTarefasPersonalizadas };
