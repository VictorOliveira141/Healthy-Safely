const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../app/config/pool_conexoes");
const { adminModel } = require("../app/models/Admin");

test("responder suporte não depende da coluna opcional atualizado_em", async () => {
  const queryOriginal = pool.query;
  let consultaExecutada;

  pool.query = async (consulta, parametros) => {
    consultaExecutada = { consulta, parametros };
    return [{ affectedRows: 1 }];
  };

  try {
    const salvo = await adminModel.responderSuporte(12, "Resposta de teste");

    assert.equal(salvo, true);
    assert.deepEqual(consultaExecutada.parametros, ["Resposta de teste", 12]);
    assert.doesNotMatch(consultaExecutada.consulta, /\batualizado_em\b/);
  } finally {
    pool.query = queryOriginal;
  }
});
