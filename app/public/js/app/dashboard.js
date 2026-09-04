/* ============================================================
   DASHBOARD | Healthy Safely
   - Filtros da rotina diária
   - Fechamento automático do aviso de feedback (flash)
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const statusFilter = document.getElementById("task-status-filter");
  const periodFilter = document.getElementById("task-period-filter");
  const periodSections = document.querySelectorAll(".task-period");
  const emptyMessage = document.querySelector(".task-filter-empty");

  function filterTasks() {
    const status = statusFilter?.value || "all";
    const period = periodFilter?.value || "all";
    let visibleTasks = 0;

    periodSections.forEach((section) => {
      const matchesPeriod =
        period === "all" || section.dataset.period === period;
      let sectionTasks = 0;

      section.querySelectorAll(".task-item").forEach((task) => {
        const visible =
          matchesPeriod && (status === "all" || task.dataset.status === status);
        task.hidden = !visible;
        if (visible) sectionTasks += 1;
      });

      section.hidden = !matchesPeriod || sectionTasks === 0;
      if (matchesPeriod) visibleTasks += sectionTasks;
    });

    if (emptyMessage) emptyMessage.hidden = visibleTasks !== 0;
  }

  statusFilter?.addEventListener("change", filterTasks);
  periodFilter?.addEventListener("change", filterTasks);

  /* ── Aviso de feedback (flash) ───────────────────────────── */
  const flashMessage = document.getElementById("flash-msg");
  if (flashMessage) {
    setTimeout(() => {
      flashMessage.classList.add("hs-flash--saindo");
      setTimeout(() => flashMessage.remove(), 300);
    }, 3500);
  }
});
