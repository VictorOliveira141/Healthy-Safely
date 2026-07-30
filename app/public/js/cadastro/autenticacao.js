function verificarAutenticacao(req, res, next) {
  if (req.session && req.session.usuario) {
    next(); // Está logado
  } else {
    res.redirect("/login"); // Não está logado
  }
}

module.exports = verificarAutenticacao;
