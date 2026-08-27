// ========================
// Função genérica para todos os gráficos
// ========================
function criarGrafico(idGrafico, maxBarras, valorMaximo, alturaMaxima) {
  const grafico = document.getElementById(idGrafico);
  const input = grafico.parentElement.querySelector("input");

  grafico.adicionarBarra = function () {
    const valor = parseFloat(input.value);

    if (isNaN(valor) || valor < 0 || valor > valorMaximo) {
      alert(`Digite um valor entre 0 e ${valorMaximo}!`);
      return;
    }

    // Calcula altura proporcional
    const alturaBarra = (valor / valorMaximo) * alturaMaxima;

    // Formata data (incrementa 1 dia da última barra)
    let ultimaData = null;
    const ultimaLabel = grafico.querySelector(".barra:last-child .label");
    if (ultimaLabel) ultimaData = ultimaLabel.textContent;

    let novaData;
    if (!ultimaData) {
      novaData = new Date();
    } else {
      const [dia, mes] = ultimaData.split("/").map(Number);
      const anoAtual = new Date().getFullYear();
      novaData = new Date(anoAtual, mes - 1, dia + 1);
    }

    const diaFormat = String(novaData.getDate()).padStart(2, "0");
    const mesFormat = String(novaData.getMonth() + 1).padStart(2, "0");
    const dataFormatada = `${diaFormat}/${mesFormat}`;

    // Remove barra mais antiga se exceder MAX_BARRAS
    const barras = grafico.querySelectorAll(".barra");
    if (barras.length >= maxBarras) barras[0].remove();

    // Cria barra
    const barra = document.createElement("div");
    barra.classList.add("barra");
    barra.style.height = alturaBarra + "px";

    // Label embaixo da barra
    const label = document.createElement("span");
    label.classList.add("label");
    label.textContent = dataFormatada;

    barra.appendChild(label);
    grafico.appendChild(barra);

    input.value = "";
    input.focus();
  };

  // Botão do gráfico
  const botao = grafico.parentElement.querySelector("button");
  botao.addEventListener("click", grafico.adicionarBarra);
}

// ========================
// Inicialização de todos os gráficos
// ========================

// Gráfico de Horas (0–12)
criarGrafico("graficoHoras", 6, 12, 255);

// Gráfico de Escala 1–10
criarGrafico("graficoMental", 6, 10, 220);

// Gráfico de Minutos (0–150)
criarGrafico("graficoExercicios", 6, 150, 215);
