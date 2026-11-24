function premiumAtivo(usuario) {
  return (
    usuario?.plano === "premium" &&
    (usuario?.premium_ativo === true || Number(usuario?.premium_ativo) === 1)
  );
}

module.exports = { premiumAtivo };
