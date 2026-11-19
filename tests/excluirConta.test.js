const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { usuarioModel } = require("../app/models/Usuario");
const usuarioController = require("../app/controllers/usuarioController");

function criarResposta() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(message) {
      this.message = message;
      return this;
    },
    clearCookie(name) {
      this.cookieLimpo = name;
      return this;
    },
    redirect(path) {
      this.destino = path;
      return this;
    },
  };
}

test("excluirConta remove usuário, encerra sessão e redireciona após confirmação", async () => {
  const deletarOriginal = usuarioModel.deletar;
  const token = crypto.randomBytes(32).toString("hex");
  let idExcluido;
  let sessaoEncerrada = false;
  usuarioModel.deletar = async (id) => {
    idExcluido = id;
    return true;
  };

  const req = {
    body: { token },
    session: {
      tokenExclusaoConta: token,
      usuario: { id: 42 },
      destroy(callback) {
        sessaoEncerrada = true;
        callback(null);
      },
    },
  };
  const res = criarResposta();

  try {
    await usuarioController.excluirConta(req, res);
    assert.equal(idExcluido, 42);
    assert.equal(sessaoEncerrada, true);
    assert.equal(res.cookieLimpo, "connect.sid");
    assert.equal(res.destino, "/login?conta=excluida");
  } finally {
    usuarioModel.deletar = deletarOriginal;
  }
});

test("excluirConta rejeita confirmação inválida sem apagar a conta", async () => {
  const deletarOriginal = usuarioModel.deletar;
  usuarioModel.deletar = async () => {
    throw new Error("A conta não deveria ser excluída.");
  };

  const req = {
    body: { token: "token-invalido" },
    session: {
      tokenExclusaoConta: crypto.randomBytes(32).toString("hex"),
      usuario: { id: 42 },
    },
  };
  const res = criarResposta();

  try {
    await usuarioController.excluirConta(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.message, /Confirmação inválida/);
  } finally {
    usuarioModel.deletar = deletarOriginal;
  }
});
