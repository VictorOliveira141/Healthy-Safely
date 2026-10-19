/* ---- Formulário de tarefa (bottom sheet / painel lateral) ----
   Só cuida de abrir e fechar. O preenchimento e a validação ficam em
   gerenciar-tarefa.js, que usa window.hsSheet. */

(function () {
  const overlay = document.getElementById("drawerOverlay");
  const sheet = document.getElementById("taskDrawer");
  if (!overlay || !sheet) return;

  const form = sheet.querySelector(".tk-form");
  const botaoFechar = document.getElementById("closeDrawer");
  const botaoCancelar = document.getElementById("cancelDrawer");
  let focoAnterior = null;

  const aberto = () => overlay.classList.contains("active");

  function abrir() {
    focoAnterior = document.activeElement;
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("tk-lock");
    setTimeout(() => {
      const primeiro = form && form.querySelector("[name='titulo']");
      if (primeiro) primeiro.focus({ preventScroll: true });
    }, 200);
  }

  function fechar() {
    if (!aberto()) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tk-lock");
    document.dispatchEvent(new CustomEvent("tk:sheet-fechado"));
    if (focoAnterior && typeof focoAnterior.focus === "function") {
      focoAnterior.focus({ preventScroll: true });
    }
  }

  botaoFechar && botaoFechar.addEventListener("click", fechar);
  botaoCancelar && botaoCancelar.addEventListener("click", fechar);

  // clique fora do painel
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });

  document.addEventListener("keydown", (e) => {
    if (!aberto()) return;
    if (e.key === "Escape") {
      fechar();
      return;
    }
    // mantém o foco dentro do formulário enquanto ele está aberto
    if (e.key === "Tab") {
      const focaveis = Array.from(
        sheet.querySelectorAll(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary",
        ),
      ).filter((el) => el.offsetParent !== null);
      if (!focaveis.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
  });

  window.hsSheet = { abrir, fechar, aberto };
})();
