function fecharModal() {
  const m = document.getElementById("hs-user-modal");
  if (!m) return;
  m.classList.remove("active");
  m.setAttribute("aria-hidden", "true");
}

document.addEventListener("click", (e) => {
  if (e.target.id === "hs-user-modal-close") {
    fecharModal();
    return;
  }
});

const modalContainer = document.getElementById("hs-user-modal");
if (modalContainer) {
  modalContainer.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) fecharModal();
  });
}

const flashMessage = document.getElementById("flash-msg");
if (flashMessage) {
  setTimeout(() => {
    flashMessage.remove();
  }, 3500);
}

const atividades = document.querySelectorAll(".atividade-item");
const barra = document.getElementById("programa-fill");
const percentual = document.getElementById("programa-percentual");

function atualizarProgresso() {
  const total = atividades.length;
  const concluidas = document.querySelectorAll(
    ".atividade-item.concluida",
  ).length;
  const progresso = total ? Math.round((concluidas / total) * 100) : 0;

  if (barra) barra.style.width = progresso + "%";
  if (percentual) percentual.textContent = progresso + "%";
}

atividades.forEach((item) => {
  const botao = item.querySelector(".atividade-btn");
  if (!botao) return;

  botao.addEventListener("click", () => {
    const concluida = item.classList.toggle("concluida");
    botao.textContent = concluida ? "Concluído" : "Concluir";
    atualizarProgresso();
  });
});

atualizarProgresso();
