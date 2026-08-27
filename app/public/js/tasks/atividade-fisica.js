const CHAVE = "hs_atf_prog";
let progresso = Number(localStorage.getItem(CHAVE) || 0);
const btn = document.getElementById("btnAcao");
const porcTexto = document.getElementById("porcTexto");
const fill = document.getElementById("barraFill");
const track = document.getElementById("barraTrack");

function renderProgresso() {
  fill.style.width = progresso + "%";
  porcTexto.textContent = progresso + "% concluída";
  track.setAttribute("aria-valuenow", progresso);
  if (progresso >= 100) {
    btn.textContent = "✓ Concluída!";
    btn.disabled = true;
  }
}

function registrar() {
  if (progresso >= 100) return;
  progresso = Math.min(progresso + 14, 100);
  localStorage.setItem(CHAVE, progresso);
  renderProgresso();
  if (progresso < 100) btn.textContent = "Registrar novamente";
}

renderProgresso();
