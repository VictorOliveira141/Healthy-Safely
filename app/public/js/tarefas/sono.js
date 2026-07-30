// Script de progresso local mantido por compatibilidade
const CHAVE = "hs_sono_prog";
let progresso = Number(localStorage.getItem(CHAVE) || 0);
const btn = document.getElementById("btnAcao");
const porcTexto = document.getElementById("porcTexto");
const fill = document.getElementById("barraFill");
const track = document.getElementById("barraTrack");

function renderProgresso() {
  if (!fill) return;
  fill.style.width = progresso + "%";
  if (porcTexto) porcTexto.textContent = progresso + "% concluída";
  if (track) track.setAttribute("aria-valuenow", progresso);
  if (progresso >= 100 && btn) {
    btn.textContent = "✓ Concluída!";
    btn.disabled = true;
  }
}

function registrar() {
  if (progresso >= 100) return;
  progresso = Math.min(progresso + 14, 100);
  localStorage.setItem(CHAVE, progresso);
  renderProgresso();
  if (progresso < 100 && btn) btn.textContent = "Registrar próxima noite";
}

renderProgresso();
