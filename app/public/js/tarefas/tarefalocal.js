/* Suporte a tarefas locais (sem banco) */
function adicionarTarefa() {
  const campo = document.getElementById("campoTarefa");
  if (!campo) return;
  const texto = campo.value.trim();
  if (!texto) return;
  const lista = document.getElementById("listaTarefasLocais");
  const li = document.createElement("li");
  li.innerHTML = `
      <article class="hs-user-task-card">
        <header class="hs-task-header">
          <section class="hs-task-left">
            <figure class="hs-task-icon">✅</figure>
            <section class="hs-task-content">
              <h3 class="hs-task-name">${texto}</h3>
              <section class="hs-task-meta">
                <span class="hs-task-pts-badge">+10 pts</span>
                <span class="hs-task-cat-badge">geral</span>
              </section>
            </section>
          </section>
          <button type="button" class="hs-task-btn" onclick="concluirLocal(this)">
            <i class="bi bi-check"></i> Concluir
          </button>
        </header>
      </article>`;
  lista.appendChild(li);
  campo.value = "";
  campo.focus();
  mostrarToast("✓ Tarefa adicionada!");
}
function concluirLocal(btn) {
  const card = btn.closest(".hs-user-task-card");
  card.classList.add("hs-task-completed");
  const nome = card.querySelector(".hs-task-name");
  if (nome) nome.style.textDecoration = "line-through";
  btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Feita';
  btn.className = "hs-task-btn hs-btn-completed";
  btn.disabled = true;
  mostrarToast("🎉 Tarefa concluída! +10 pts");
}
function mostrarToast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("p");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
document.addEventListener("DOMContentLoaded", () => {
  const campo = document.getElementById("campoTarefa");
  if (campo)
    campo.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.querySelector("[type=submit]")?.click();
      }
    });
});
