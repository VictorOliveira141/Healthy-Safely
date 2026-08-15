const test = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const { enviarEmailResetSenha } = require('../app/config/email');
const { usuarioModel } = require('../app/models/Usuario');

test('usuarioModel deve expor helpers de reset de senha', () => {
  assert.equal(typeof usuarioModel.gerarTokenRecuperacao, 'function');
  assert.equal(typeof usuarioModel.buscarPorTokenRecuperacao, 'function');
  assert.equal(typeof usuarioModel.alterarSenhaComToken, 'function');
});

test('enviarEmailResetSenha deve abortar com timeout em vez de travar a requisição', async () => {
  const originalCreateTransport = nodemailer.createTransport;
  nodemailer.createTransport = () => ({
    sendMail: () => new Promise(() => {}),
  });

  const previous = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_TIMEOUT_MS: process.env.SMTP_TIMEOUT_MS,
  };

  process.env.SMTP_HOST = 'smtp.gmail.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'usuario@teste.com';
  process.env.SMTP_PASS = 'senha-teste';
  process.env.SMTP_TIMEOUT_MS = '300';

  try {
    const resultado = await Promise.race([
      enviarEmailResetSenha('destinatario@teste.com', 'token', {
        get: () => 'example.com',
        protocol: 'https',
      }),
      new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 1500)),
    ]);

    assert.equal(resultado.timedOut, undefined);
    assert.equal(resultado.ok, false);
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
});
