const test = require('node:test');
const assert = require('node:assert/strict');
const { usuarioModel } = require('../app/models/Usuario');

test('usuarioModel deve expor helpers de reset de senha', () => {
  assert.equal(typeof usuarioModel.gerarTokenRecuperacao, 'function');
  assert.equal(typeof usuarioModel.buscarPorTokenRecuperacao, 'function');
  assert.equal(typeof usuarioModel.alterarSenhaComToken, 'function');
});
