document.addEventListener("DOMContentLoaded", () => {
  const botao = document.getElementById("botaoMenuMais");
  const menu = document.getElementById("menuMaisOpcoes");

  if (!botao || !menu) return;

  botao.addEventListener("click", (event) => {
    event.stopPropagation();

    const aberto = menu.classList.toggle("aberto");

    botao.setAttribute("aria-expanded", aberto);
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && !botao.contains(event.target)) {
      menu.classList.remove("aberto");
      botao.setAttribute("aria-expanded", "false");
    }
  });
});