/* ---- script para gerenciamento de tarefas ---- */

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchTask");
  const filterStatus = document.getElementById("filterStatus");
  const filterCategory = document.getElementById("filterCategory");
  const repeatSelect = document.getElementById("repeticaoTarefa");
  const diaSemanaGroup = document.getElementById("diaSemanaGroup");
  const drawerOverlay = document.getElementById("drawerOverlay");
  const taskItems = Array.from(
    document.querySelectorAll(".hs-user-tasks > li"),
  );
  const countBadge = document.querySelector(".hs-section-count");
  const dayNames = [
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
  ];
  const form = document.querySelector(".hs-drawer-form");
  const taskToEdit = window.taskToEdit || null;

  if (form && taskToEdit) {
    form.action = `/tasks/atualizar/${taskToEdit._id}`;
    form.querySelector('input[name="titulo"]').value = taskToEdit.title || "";
    form.querySelector('textarea[name="descricao"]').value =
      taskToEdit.descricao || "";
    form.querySelector('select[name="categoria"]').value =
      taskToEdit.categoria || "geral";
    form.querySelector('input[name="data"]').value = taskToEdit.data || "";
    form.querySelector('input[name="horario"]').value =
      taskToEdit.horario || "";
    form.querySelector('select[name="repeticao"]').value =
      taskToEdit.repeticao || "once";
    form.querySelector('select[name="dia_semana"]').value =
      taskToEdit.dia_semana || "";
    const saveTaskText = document.getElementById("saveTaskText");
    if (saveTaskText) saveTaskText.textContent = "Atualizar tarefa";
    const saveTaskIcon = document.querySelector("#saveTaskButton i");
    if (saveTaskIcon) saveTaskIcon.className = "bi bi-pencil-square";
    if (drawerOverlay) {
      drawerOverlay.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  // Toggle detalhes das tarefas
  const toggleButtons = Array.from(
    document.querySelectorAll(".hs-toggle-details"),
  );
  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      const card = li ? li.querySelector(".hs-user-task-card") : null;
      if (!card) return;
      const isOpen = card.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
    });
  });

  if (repeatSelect && diaSemanaGroup) {
    const toggleDiaSemana = () => {
      const show = repeatSelect.value === "weekly";
      diaSemanaGroup.style.display = show ? "block" : "none";
      if (!show) {
        const select = diaSemanaGroup.querySelector("select");
        if (select) select.value = "";
      }
    };

    repeatSelect.addEventListener("change", toggleDiaSemana);
    toggleDiaSemana();
  }

  function matchesStatus(taskCard) {
    const status = filterStatus?.value || "today";
    if (status === "all") return true;
    const repeticao = (taskCard.dataset.repeticao || "once").toLowerCase();
    const diaSemana = (taskCard.dataset.diaSemana || "").toLowerCase();
    const dataRaw = taskCard.dataset.data;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (status === "today") {
      if (repeticao === "daily") return true;
      if (repeticao === "weekly" && diaSemana) {
        return diaSemana === dayNames[today.getDay()];
      }
      if (!dataRaw) return true;
      const taskDate = new Date(`${dataRaw}T00:00:00`);
      return taskDate.getTime() === today.getTime();
    }

    if (status === "nextweek") {
      if (repeticao === "daily") return true;
      if (repeticao === "weekly" && diaSemana) {
        const hoje = today.getDay();
        const proximosDias = new Set();
        for (let i = 0; i <= 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          proximosDias.add(dayNames[d.getDay()]);
        }
        return proximosDias.has(diaSemana);
      }
      if (!dataRaw) return true;
      const taskDate = new Date(`${dataRaw}T00:00:00`);
      const diff = Math.round(
        (taskDate.getTime() - today.getTime()) / 86400000,
      );
      return diff >= 0 && diff <= 7;
    }

    return true;
  }

  function aplicarFiltros() {
    const termoBusca = (searchInput?.value || "").trim().toLowerCase();
    const categoria = filterCategory?.value || "";
    let visible = 0;

    taskItems.forEach((item) => {
      const taskCard = item.querySelector(".hs-user-task-card");
      const title = (taskCard?.dataset.title || "").toLowerCase();
      const categoriaTask = (taskCard?.dataset.category || "").toLowerCase();
      const matchesSearch =
        !termoBusca ||
        title.includes(termoBusca) ||
        categoriaTask.includes(termoBusca);
      const matchesCategory = !categoria || categoriaTask === categoria;
      const matchesStatusValue = matchesStatus(taskCard);
      const shouldShow = matchesSearch && matchesCategory && matchesStatusValue;

      item.style.display = shouldShow ? "" : "none";
      if (shouldShow) visible += 1;
    });

    if (countBadge) {
      countBadge.textContent = String(visible);
    }
  }

  searchInput?.addEventListener("input", aplicarFiltros);
  filterStatus?.addEventListener("change", aplicarFiltros);
  filterCategory?.addEventListener("change", aplicarFiltros);
  aplicarFiltros();
});
