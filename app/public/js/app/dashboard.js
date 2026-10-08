/* ============================================================
   DASHBOARD | Healthy Safely — "Minha rotina"
   - Saudação, data e semana (data local do navegador)
   - Filtros (status + período) em chips
   - Recolher/expandir períodos
   - Concluir tarefa com feedback imediato (usa a rota existente
     GET /tasks/concluir?id=..., com fallback para navegação normal)
   - Progresso, "próxima tarefa" e estado "Tudo certo!"
   - Fechamento automático do aviso de feedback (flash)
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector(".rt");

  /* ── Aviso de feedback (flash) ───────────────────────────── */
  const flashMessage = document.getElementById("flash-msg");
  if (flashMessage) {
    setTimeout(() => {
      flashMessage.classList.add("hs-flash--saindo");
      setTimeout(() => flashMessage.remove(), 300);
    }, 3500);
  }

  if (!root) return;

  const $ = (sel, ctx = root) => ctx.querySelector(sel);
  const $$ = (sel, ctx = root) => Array.from(ctx.querySelectorAll(sel));

  /* ── Saudação, data e semana ─────────────────────────────── */
  const agora = new Date();
  const hora = agora.getHours();
  const hello = $('[data-rt="hello"]');
  if (hello) {
    hello.textContent =
      hora < 12 ? "Bom dia," : hora < 18 ? "Boa tarde," : "Boa noite,";
  }

  const dateEl = $('[data-rt="date"]');
  if (dateEl) {
    const txt = agora.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    dateEl.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  const weekEl = document.getElementById("rtWeek");
  if (weekEl) {
    const nomes = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
    const segunda = new Date(agora);
    segunda.setDate(agora.getDate() - ((agora.getDay() + 6) % 7));
    nomes.forEach((nome, i) => {
      const d = new Date(segunda);
      d.setDate(segunda.getDate() + i);
      const li = document.createElement("li");
      li.className = "rt-day";
      const label = document.createElement("span");
      label.textContent = nome;
      const num = document.createElement("b");
      num.textContent = d.getDate();
      li.append(label, num);
      if (d.toDateString() === agora.toDateString()) {
        li.classList.add("is-today");
        li.setAttribute("aria-current", "date");
      }
      weekEl.appendChild(li);
    });
  }

  /* ── Elementos da rotina ─────────────────────────────────── */
  const periodSections = $$(".rt-period");
  const noResult = document.getElementById("rtNoResult");
  const statusBtns = $$(".rt-seg__btn");
  const periodBtns = $$(".rt-pchip");
  const state = { status: "all", period: "all" };

  const plural = (n) => `${n} ${n === 1 ? "tarefa" : "tarefas"}`;

  /* Marca primeiro/último item visível (para a linha da timeline) */
  function markEnds(section) {
    const visiveis = $$(".rt-item", section).filter((li) => !li.hidden);
    $$(".rt-item", section).forEach((li) =>
      li.classList.remove("is-first", "is-last"),
    );
    if (visiveis.length) {
      visiveis[0].classList.add("is-first");
      visiveis[visiveis.length - 1].classList.add("is-last");
    }
  }

  /* ── Filtros ─────────────────────────────────────────────── */
  function applyFilters() {
    periodSections.forEach((section) => {
      const matchesPeriod =
        state.period === "all" || section.dataset.period === state.period;
      const items = $$(".rt-item", section);
      let visible = 0;

      items.forEach((li) => {
        const show =
          matchesPeriod &&
          (state.status === "all" || li.dataset.status === state.status);
        li.hidden = !show;
        if (show) visible += 1;
      });

      if (items.length) {
        section.hidden = !matchesPeriod || visible === 0;
        const count = $('[data-rt="count"]', section);
        if (count) count.textContent = plural(visible);
        markEnds(section);
      } else {
        // período sem tarefas: só aparece quando não há filtro de status
        section.hidden = !(matchesPeriod && state.status === "all");
      }
    });

    if (noResult) {
      const algumaVisivel = periodSections.some((s) => !s.hidden);
      noResult.hidden = algumaVisivel || !$(".rt-item");
    }
  }

  function setActive(buttons, active) {
    buttons.forEach((b) => {
      const on = b === active;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  statusBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      state.status = btn.dataset.status;
      setActive(statusBtns, btn);
      applyFilters();
    }),
  );
  periodBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      state.period = btn.dataset.period;
      setActive(periodBtns, btn);
      applyFilters();
    }),
  );
  document.getElementById("rtClear")?.addEventListener("click", () => {
    state.status = "all";
    state.period = "all";
    setActive(statusBtns, statusBtns[0]);
    setActive(periodBtns, periodBtns[0]);
    applyFilters();
  });

  /* ── Recolher / expandir período ─────────────────────────── */
  $$(".rt-period__toggle").forEach((btn) =>
    btn.addEventListener("click", () => {
      const aberto = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!aberto));
      const body = document.getElementById(btn.getAttribute("aria-controls"));
      if (body) body.hidden = aberto;
    }),
  );

  /* ── Progresso / próxima tarefa ──────────────────────────── */
  function updateProgress() {
    const all = $$(".rt-item");
    const total = all.length;
    const done = all.filter((li) => li.dataset.status === "completed").length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    const ring = $('[data-rt="ring"]');
    if (ring) ring.style.setProperty("--p", pct);
    const pctEl = $('[data-rt="pct"]');
    if (pctEl) pctEl.textContent = `${pct}%`;
    $(".rt-ring")?.setAttribute(
      "aria-label",
      `${pct}% das tarefas concluídas hoje`,
    );
    const bar = $('[data-rt="bar"]');
    if (bar) bar.style.width = `${pct}%`;

    const summary = $('[data-rt="summary"]');
    if (summary && total) {
      summary.textContent = `${done} de ${total} tarefa${total === 1 ? "" : "s"} concluída${done === 1 ? "" : "s"}`;
    }

    const tudoCerto = total > 0 && done === total;
    root.classList.toggle("is-all-done", tudoCerto);
    const doneMsg = $('[data-rt="done"]');
    if (doneMsg) doneMsg.hidden = !tudoCerto;
    const nudge = $(".rt-nudge__text strong");
    if (nudge) nudge.textContent = tudoCerto ? "Dia completo!" : "Ainda tem tempo!";

    updateNext();
  }

  function updateNext() {
    $$(".rt-item--next").forEach((li) => li.classList.remove("rt-item--next"));
    const prox = $$('.rt-item[data-timed="1"]').find(
      (li) => li.dataset.status === "pending",
    );
    const nextWrap = $('[data-rt="next"]');
    const nextText = $('[data-rt="next-text"]');
    if (prox) {
      prox.classList.add("rt-item--next");
      if (nextText) nextText.textContent = `${prox.dataset.time} · ${prox.dataset.title}`;
      if (nextWrap) nextWrap.hidden = false;
    } else if (nextWrap) {
      nextWrap.hidden = true;
    }
  }

  /* ── Concluir / desfazer ─────────────────────────────────── */
  function setDone(li, done) {
    li.dataset.status = done ? "completed" : "pending";
    const card = $(".rt-card", li);
    card?.classList.toggle("is-done", done);
    const btn = $(".rt-check", li);
    if (btn) {
      btn.setAttribute("aria-pressed", String(done));
      btn.setAttribute(
        "aria-label",
        `${done ? "Desfazer conclusão: " : "Concluir: "}${li.dataset.title}`,
      );
      btn.classList.remove("pop");
      void btn.offsetWidth; // reinicia a animação
      btn.classList.add("pop");
    }
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "rt-toast";
    el.setAttribute("role", "status");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest(".rt-check");
    if (!btn) return;
    // permite abrir em nova aba etc.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();

    const li = btn.closest(".rt-item");
    if (!li || li.dataset.busy) return;
    li.dataset.busy = "1";

    const eraConcluida = li.dataset.status === "completed";
    setDone(li, !eraConcluida);
    updateProgress();

    try {
      const res = await fetch(btn.href, { credentials: "same-origin" });
      const caiuForaDoApp =
        res.redirected && !/^\/(dashboard|tasks)/.test(new URL(res.url).pathname);
      if (!res.ok || caiuForaDoApp) {
        // sessão expirada ou resposta inesperada: usa o fluxo normal
        window.location.href = btn.href;
        return;
      }
    } catch (err) {
      setDone(li, eraConcluida);
      updateProgress();
      toast("Não foi possível atualizar a tarefa. Tente novamente.");
    } finally {
      delete li.dataset.busy;
    }

    // se há filtro ativo, reaplica depois de a animação ser percebida
    setTimeout(applyFilters, 650);
  });

  applyFilters();
  updateNext();
});