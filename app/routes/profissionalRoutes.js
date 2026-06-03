const express = require("express");
const router = express.Router();

function apenasProfissional(req, res, next) {
  if (!req.session?.usuario) return res.redirect("/login");
  if (req.session.usuario.tipo !== "profissional") return res.redirect("/dashboard");
  next();
}

router.get("/", apenasProfissional, (req, res) => {
  res.redirect("/profissional/painel-financeiro");
});

router.get("/painel-financeiro", apenasProfissional, (req, res) => {
  res.send("Painel profissional em construção. Volte em breve.");
});

router.get("/pacientes", apenasProfissional, (req, res) => {
  res.send("Página de pacientes em construção. Volte em breve.");
});

module.exports = router;
