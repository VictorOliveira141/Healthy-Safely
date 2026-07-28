let eventoInstalacao;

const botaoInstalar = document.getElementById("btnInstalar");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();

  eventoInstalacao = e;

  botaoInstalar.hidden = false;
});

botaoInstalar?.addEventListener("click", async () => {
  if (!eventoInstalacao) return;

  eventoInstalacao.prompt();

  const resultado = await eventoInstalacao.userChoice;

  if (resultado.outcome === "accepted") {
    console.log("Aplicativo instalado");
  }

  eventoInstalacao = null;

  botaoInstalar.hidden = true;
});

// Esconde caso já esteja instalado

window.addEventListener("appinstalled", () => {
  botaoInstalar.hidden = true;
});
