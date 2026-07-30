const items = document.querySelectorAll(".ajuda-aside li");
const secoes = document.querySelectorAll(".secao");

function ativar(secao) {
  secoes.forEach((s) => s.classList.remove("ativa"));

  const alvo = document.getElementById(secao);
  if (alvo) {
    alvo.classList.add("ativa");
  }

  items.forEach((i) => i.classList.remove("ativo"));

  const itemAtivo = document.querySelector(`[data-section="${secao}"]`);
  if (itemAtivo) {
    itemAtivo.classList.add("ativo");
  }
}

items.forEach((item) => {
  item.addEventListener("click", () => {
    const secao = item.getAttribute("data-section");

    history.pushState(null, "", `?secao=${secao}`);

    ativar(secao);
  });
});

const params = new URLSearchParams(window.location.search);
const secaoInicial = params.get("secao") || "comecando";

ativar(secaoInicial);

document.addEventListener("click", (e) => {
  const header = e.target.closest(".accordion-header");
  if (!header) return;

  const content = header.nextElementSibling;

  document.querySelectorAll(".accordion-content").forEach((c) => {
    if (c !== content) c.classList.remove("ativo");
  });

  content.classList.toggle("ativo");
});