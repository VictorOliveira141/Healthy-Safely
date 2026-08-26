const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "AVISO: GEMINI_API_KEY não definido. As funcionalidades de IA (Healthy AI) não funcionarão sem a chave.",
  );
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

let client = null;
function getClient() {
  if (!client && process.env.GEMINI_API_KEY) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

module.exports = { getClient, MODEL };
