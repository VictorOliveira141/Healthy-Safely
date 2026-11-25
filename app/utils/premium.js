function premiumAtivo(usuario) {
  return (
    usuario?.plano === "premium" &&
    (usuario?.premium_ativo === true || Number(usuario?.premium_ativo) === 1)
  );
}

// Versão para dados da sessão: confere também a data de expiração, porque
// premium_ativo pode ter sido calculado antes do Premium vencer.
function premiumAtivoNaSessao(usuario, agora = new Date()) {
  if (usuario?.plano !== "premium") return false;
  if (!usuario.premium_ate) return premiumAtivo(usuario);
  const expira = new Date(usuario.premium_ate);
  return !Number.isNaN(expira.getTime()) && expira > agora;
}

module.exports = { premiumAtivo, premiumAtivoNaSessao };
