/* ============================================================
   PROGRESSÃO | Healthy Safely
   - Gráfico de barras (sem biblioteca) para 7 e 30 dias
   - Troca de período atualiza gráfico, métricas, comparação e histórico
   - Banner de conquista: aparece uma vez e pode ser dispensado
   Todos os números vêm do servidor (JSON em #pgData).
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const dataEl = document.getElementById("pgData");
  const chartEl = document.getElementById("pgChart");
  if (!dataEl || !chartEl) return;

  let dados;
  try {
    dados = JSON.parse(dataEl.textContent);
  } catch (e) {
    return;
  }

  const SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const dataLocal = (iso) => new Date(`${iso}T12:00:00`);
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const dd = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

  const totalEl = document.getElementById("pgTotal");
  const ativosEl = document.getElementById("pgAtivos");
  const taxaEl = document.getElementById("pgTaxa");
  const comparacaoEl = document.getElementById("pgComparacao");
  const histPeriodoEl = document.getElementById("pgHistoricoPeriodo");
  const histVazioEl = document.getElementById("pgHistVazio");
  const histItens = Array.from(
    document.querySelectorAll("#pgHistLista .pg-hist-dia"),
  );
  const botoes = Array.from(document.querySelectorAll(".pg-seg__btn"));

  /* ── Gráfico ─────────────────────────────────────────────── */
  function maximoDoEixo(maior) {
    if (maior <= 4) return 4;
    return Math.ceil(maior / 2) * 2;
  }

  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function desenhar(periodo) {
    const info = dados.periodos[periodo];
    const dias = info.dias;
    const maior = Math.max(0, ...dias.map((d) => d.concluidas));
    const topo = maximoDoEixo(maior);

    chartEl.replaceChildren();

    // eixo Y: 0, meio, topo
    const eixo = el("div", "pg-chart__y");
    [topo, topo / 2, 0].forEach((v) =>
      eixo.appendChild(el("span", null, String(v))),
    );
    eixo.setAttribute("aria-hidden", "true");

    const area = el("div", "pg-chart__plot");
    const grade = el("div", "pg-chart__grid");
    grade.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 3; i++) grade.appendChild(el("span"));
    area.appendChild(grade);

    const barras = el("ol", `pg-bars pg-bars--${periodo}`);
    dias.forEach((d, i) => {
      const data = dataLocal(d.iso);
      const col = el("li", "pg-bar-col");
      if (d.concluidas === 0) col.classList.add("is-zero");
      if (d.iso === dados.hoje) col.classList.add("is-hoje");

      const nomeDia = SEMANA[data.getDay()];
      col.setAttribute(
        "aria-label",
        `${nomeDia.toLowerCase()}, ${dd(d.iso)}: ${plural(d.concluidas, "tarefa concluída", "tarefas concluídas")}`,
      );
      col.title = `${nomeDia} ${dd(d.iso)}: ${d.concluidas}`;

      const areaBarra = el("div", "pg-bar-col__area");
      const barra = el("div", "pg-bar-col__bar");
      barra.style.height = `${(d.concluidas / topo) * 100}%`;
      barra.style.animationDelay = `${i * (periodo === 7 ? 40 : 12)}ms`;
      areaBarra.appendChild(barra);
      if (periodo === 7 && d.concluidas > 0) {
        barra.appendChild(
          el("span", "pg-bar-col__value", String(d.concluidas)),
        );
      }
      col.appendChild(areaBarra);

      // rótulos: semana = dia da semana; mês = dia do mês a cada 5 barras
      let rotulo = "";
      if (periodo === 7) rotulo = nomeDia;
      else if ((dias.length - 1 - i) % 5 === 0) rotulo = String(data.getDate());
      const r = el("div", "pg-bar-col__label");
      r.appendChild(el("span", null, rotulo));
      col.appendChild(r);

      barras.appendChild(col);
    });
    area.appendChild(barras);

    chartEl.appendChild(eixo);
    chartEl.appendChild(area);
  }

  /* ── Métricas e comparação ───────────────────────────────── */
  function atualizarMetricas(periodo) {
    const info = dados.periodos[periodo];
    totalEl.textContent = String(info.total);
    ativosEl.textContent = `${info.diasAtivos}/${periodo}`;
    taxaEl.textContent = info.taxa == null ? "–" : `${info.taxa}%`;

    const c = info.comparacao;
    if (!c) {
      comparacaoEl.hidden = true;
      return;
    }
    const janela = periodo === 7 ? "7 dias anteriores" : "30 dias anteriores";
    let texto;
    if (c.variacao > 0)
      texto = `Você concluiu ${c.variacao}% mais tarefas que nos ${janela}.`;
    else if (c.variacao < 0)
      texto = `Você concluiu ${Math.abs(c.variacao)}% menos tarefas que nos ${janela}.`;
    else
      texto = `Você manteve o mesmo número de tarefas concluídas dos ${janela}.`;
    comparacaoEl.replaceChildren(
      el("i", "bi bi-graph-up-arrow"),
      el("span", null, texto),
    );
    comparacaoEl.firstChild.setAttribute("aria-hidden", "true");
    comparacaoEl.hidden = false;
  }

  /* ── Histórico filtrado pelo período ─────────────────────── */
  function atualizarHistorico(periodo) {
    const dias = dados.periodos[periodo].dias;
    const inicio = dias[0].iso;
    let visiveis = 0;
    histItens.forEach((li) => {
      const mostra = li.dataset.dia >= inicio && li.dataset.dia <= dados.hoje;
      li.hidden = !mostra;
      if (mostra) visiveis += 1;
    });
    if (histPeriodoEl) histPeriodoEl.textContent = `Últimos ${periodo} dias`;
    if (histVazioEl) histVazioEl.hidden = visiveis > 0;
  }

  function trocarPeriodo(periodo) {
    botoes.forEach((b) => {
      const ativo = Number(b.dataset.periodo) === periodo;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-pressed", String(ativo));
    });
    desenhar(periodo);
    atualizarMetricas(periodo);
    atualizarHistorico(periodo);
  }

  botoes.forEach((b) =>
    b.addEventListener("click", () => trocarPeriodo(Number(b.dataset.periodo))),
  );
  trocarPeriodo(7); // visualização semanal por padrão

  /* ── Banner de conquista ─────────────────────────────────── */
  // Cada conquista tem um identificador estável (ex.: recorde-7, semana-2026-10-05).
  // Depois de dispensada, não volta a aparecer.
  const banner = document.getElementById("pgConquista");
  if (banner) {
    const chave = `hs-progressao-dispensadas-${dados.usuarioId}`;
    let dispensadas = [];
    try {
      dispensadas = JSON.parse(localStorage.getItem(chave) || "[]");
    } catch (e) {
      dispensadas = [];
    }
    const id = banner.dataset.id;
    if (!dispensadas.includes(id)) banner.hidden = false;

    document
      .getElementById("pgConquistaFechar")
      ?.addEventListener("click", () => {
        banner.hidden = true;
        try {
          localStorage.setItem(
            chave,
            JSON.stringify([...dispensadas, id].slice(-30)),
          );
        } catch (e) {
          /* armazenamento indisponível: o aviso apenas some nesta visita */
        }
      });
  }
});
