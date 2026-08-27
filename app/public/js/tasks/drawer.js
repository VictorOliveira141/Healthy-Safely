document.addEventListener("DOMContentLoaded", () => {
  const btnNovaTarefa = document.getElementById("btnNovaTarefa");
  const drawerOverlay = document.getElementById("drawerOverlay");
  const taskDrawer = document.getElementById("taskDrawer");

  const closeDrawer = document.getElementById("closeDrawer");
  const cancelDrawer = document.getElementById("cancelDrawer");

  const form = document.querySelector(".hs-drawer-form");
  const primeiroInput = form.querySelector("input[name='titulo']");

  /* ============================
       Abrir
    ============================ */

  function abrirDrawer() {
    drawerOverlay.classList.add("active");

    document.body.style.overflow = "hidden";

  }

  /* ============================
       Fechar
    ============================ */

  function fecharDrawer() {
    drawerOverlay.classList.remove("active");

    document.body.style.overflow = "";

    form.reset();
  }

  /* ============================
       Eventos
    ============================ */

  btnNovaTarefa.addEventListener("click", abrirDrawer);

  closeDrawer.addEventListener("click", fecharDrawer);

  cancelDrawer.addEventListener("click", fecharDrawer);

  /* ============================
       Clique fora
    ============================ */

  drawerOverlay.addEventListener("click", (e) => {
    if (e.target === drawerOverlay) {
      fecharDrawer();
    }
  });

  /* ============================
       ESC
    ============================ */

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      fecharDrawer();
    }
  });
});
