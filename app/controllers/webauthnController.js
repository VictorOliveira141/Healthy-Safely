const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const webauthnModel = require("../models/webauthnModel");

const { usuarioModel } = require("../models/Usuario");

const RP_NAME = "Healthy Safely";
const RP_ID = "healthy-safely.onrender.com";
const ORIGIN = "https://healthy-safely.onrender.com";

const webauthnController = {
  gerarOpcoesCadastro: async (req, res) => {
    try {
      if (!req.session?.usuario) {
        return res.status(401).json({
          erro: "Usuário não autenticado.",
        });
      }

      const usuario = req.session.usuario;

      const credenciais = await webauthnModel.buscarPorUsuario(usuario.id);

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,

        userName: usuario.email,
        userDisplayName: usuario.nome,

        excludeCredentials: credenciais.map((credencial) => ({
          id: credencial.credential_id,
        })),

        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },

        supportedAlgorithmIDs: [-7, -257],
      });

      req.session.webauthnChallenge = options.challenge;

      res.json(options);
    } catch (error) {
      console.error("Erro ao gerar opções WebAuthn:", error);

      res.status(500).json({
        erro: "Erro ao iniciar cadastro da biometria.",
      });
    }
  },

  verificarCadastro: async (req, res) => {
    try {
      if (!req.session?.usuario) {
        return res.status(401).json({
          erro: "Usuário não autenticado.",
        });
      }

      if (!req.session.webauthnChallenge) {
        return res.status(400).json({
          erro: "Desafio WebAuthn não encontrado.",
        });
      }

      const verification = await verifyRegistrationResponse({
        response: req.body,

        expectedChallenge: req.session.webauthnChallenge,

        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,

        requireUserVerification: true,
      });

      if (!verification.verified) {
        return res.status(400).json({
          erro: "Não foi possível cadastrar a biometria.",
        });
      }

      const { registrationInfo } = verification;

      const credential = registrationInfo.credential;

      await webauthnModel.salvarCredencial({
        usuario_id: req.session.usuario.id,

        credential_id: credential.id,

        public_key: Buffer.from(credential.publicKey).toString("base64"),

        counter: credential.counter,
      });

      delete req.session.webauthnChallenge;

      return res.json({
        sucesso: true,
      });
    } catch (error) {
      console.error("Erro ao verificar cadastro WebAuthn:", error);

      res.status(500).json({
        erro: "Erro ao cadastrar a biometria.",
      });
    }
  },

  gerarOpcoesLogin: async (req, res) => {
    try {
      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: "required",
      });

      req.session.webauthnChallenge = options.challenge;

      res.json(options);
    } catch (error) {
      console.error("Erro ao gerar opções de login WebAuthn:", error);

      res.status(500).json({
        erro: "Erro ao iniciar login com biometria.",
      });
    }
  },

  verificarLogin: async (req, res) => {
    try {
      if (!req.session?.webauthnChallenge) {
        return res.status(400).json({
          erro: "Desafio WebAuthn não encontrado.",
        });
      }

      const credencial = await webauthnModel.buscarPorCredentialId(req.body.id);

      if (!credencial) {
        return res.status(401).json({
          erro: "Credencial não encontrada.",
        });
      }

      const verification = await verifyAuthenticationResponse({
        response: req.body,

        expectedChallenge: req.session.webauthnChallenge,

        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,

        credential: {
          id: credencial.credential_id,

          publicKey: Buffer.from(credencial.public_key, "base64"),

          counter: credencial.counter,
        },

        requireUserVerification: true,
      });

      if (!verification.verified) {
        return res.status(401).json({
          erro: "Autenticação biométrica inválida.",
        });
      }

      await webauthnModel.atualizarCounter(
        credencial.credential_id,
        verification.authenticationInfo.newCounter,
      );

      const usuario = await usuarioModel.buscarPorId(credencial.usuario_id);

      if (!usuario) {
        return res.status(401).json({
          erro: "Usuário não encontrado.",
        });
      }

      delete usuario.senha;

      req.session.usuario = usuario;
      req.session.usuario.onboarding_concluido = !!usuario.onboarding_concluido;

      req.session.nome = usuario.nome;
      req.session.nivel = usuario.nivel || "iniciante";

      delete req.session.webauthnChallenge;

      return res.json({
        sucesso: true,
        redirect: usuario.onboarding_concluido ? "/dashboard" : "/onboarding",
      });
    } catch (error) {
      console.error("Erro ao verificar login WebAuthn:", error);

      res.status(500).json({
        erro: "Erro ao realizar login com biometria.",
      });
    }
  },
};

module.exports = webauthnController;
