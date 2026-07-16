// Aplicar tema imediatamente para evitar flash
const temaSalvo = localStorage.getItem("hs_tema") || "auto";
if (temaSalvo === "dark") {
  document.documentElement.classList.add("dark");
} else if (temaSalvo === "light") {
  // já é claro
} else {
  const temaSistema = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (temaSistema) document.documentElement.classList.add("dark");
}

document.addEventListener("DOMContentLoaded", () => {
  const selectTheme = document.getElementById("selectTheme");

  // Tema salvo ou padrão automático
  const temaSalvo = localStorage.getItem("hs_tema") || "auto";

  // Aplica o tema
  if (temaSalvo === "dark") {
    document.documentElement.classList.add("dark");
  } else if (temaSalvo === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    // automático
    const temaSistema = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.classList.toggle("dark", temaSistema);
  }

  // Atualiza o select (se existir)
  if (selectTheme) {
    selectTheme.value = temaSalvo;

    selectTheme.addEventListener("change", () => {
      const novoTema = selectTheme.value;
      localStorage.setItem("hs_tema", novoTema);

      if (novoTema === "dark") {
        document.documentElement.classList.add("dark");
      } else if (novoTema === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        // automático
        const temaSistema = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        document.documentElement.classList.toggle("dark", temaSistema);
      }
    });
  }

  // Atualiza automaticamente se o sistema mudar (sempre escuta, mas aplica apenas se automático)
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      const currentTema = localStorage.getItem("hs_tema") || "auto";
      if (currentTema === "auto") {
        document.documentElement.classList.toggle("dark", e.matches);
      }
    });
});

function salvarConfigs() {
  const msg = document.getElementById("msgSalvo");
  if (msg) {
    msg.style.display = "block";
    setTimeout(() => {
      msg.style.display = "none";
    }, 3000);
  }
}
