require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { usuarioModel } = require("./app/models/Usuario");
const app = express();
const porta = process.env.PORT || 3000;

// ── Sessão ────────────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || "hs-segredo-dev",
    resave: false,
    saveUninitialized: false,
  }),
);

// ── Autenticação com Google ───────────────────────────────
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const usuario = await usuarioModel.buscarPorId(id);
    done(null, usuario || null);
  } catch (error) {
    done(error, null);
  }
});

const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

if (googleConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback",
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, params, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("Google não retornou um e-mail válido."));
          }

          let usuario = await usuarioModel.buscarPorEmail(email);
          if (usuario) {
            return done(null, usuario);
          }

          const nome =
            profile.displayName ||
            [profile.name?.givenName, profile.name?.familyName]
              .filter(Boolean)
              .join(" ") ||
            email.split("@")[0];
          const nomeusuario = await usuarioModel.gerarNomeUsuarioDisponivel(nome);
          const novoUsuario = await usuarioModel.criarClienteGoogle({
            nome,
            nomeusuario,
            email,
            foto_perfil: profile.photos?.[0]?.value || null,
          });

          return done(null, novoUsuario);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

app.use(passport.initialize());
app.use(passport.session());

// ── Torna o usuário disponível em todas as views EJS ──────
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  next();
});

// ── Parsers ───────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Arquivos estáticos ────────────────────────────────────
app.use("/icons", express.static("node_modules/boxicons"));
app.use(express.static("./app/public"));

// ── View engine ───────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", "./app/views");

// ── Routers ───────────────────────────────────────────────
const rotaPrincipal = require("./app/routes/principalRoutes");
const rotaProfissional = require("./app/routes/profissionalRoutes");
const rotaAdmin = require("./app/routes/admRoutes");

app.use("/", rotaPrincipal);
app.use("/profissional", rotaProfissional);
app.use("/admin", rotaAdmin);

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render("pages/404", {});
});

// ── Iniciar servidor ──────────────────────────────────────
app.listen(porta, () => {
  console.log(` Healthy Safely rodando em http://localhost:${porta}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || "desenvolvimento"}\n`);
});
