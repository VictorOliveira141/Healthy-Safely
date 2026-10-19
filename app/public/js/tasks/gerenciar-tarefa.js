/* ---- Página de Tarefas: semana, filtros, formulário e exclusão ----
   As tarefas já chegam renderizadas pelo servidor (um painel por dia).
   Aqui só trocamos de dia, filtramos, validamos e abrimos o formulário.
   Criar, editar, concluir e excluir continuam usando as rotas existentes. */

document.addEventListener("DOMContentLoaded", () => {
  const raiz = document.querySelector(".tk");
  if (!raiz) return;

  const diaHoje = raiz.dataset.diaHoje;
  const abas = Array.from(raiz.querySelectorAll(".tk-daybtn"));
  const paineis = Array.from(raiz.querySelectorAll(".tk-day"));
  const dias = abas.map((a) => a.dataset.dia);
  const CHAVE_DIA = "hs-tarefas-dia";

  const busca = document.getElementById("searchTask");
  const filtroCategoria = document.getElementById("filterCategory");
  const botoesStatus = Array.from(raiz.querySelectorAll("[data-status]")).filter(
    (b) => b.tagName === "BUTTON",
  );
  let statusAtual = "all";
  let diaAtual = diaHoje;

  /* ── sessionStorage protegido (pode estar bloqueado) ───────── */
  const guardar = (valor) => {
    try {
      sessionStorage.setItem(CHAVE_DIA, valor);
    } catch (e) {
      /* sem persistência: segue funcionando */
    }
  };
  const lerGuardado = () => {
    try {
      return sessionStorage.getItem(CHAVE_DIA);
    } catch (e) {
      return null;
    }
  };

  /* ── Navegação por dia ─────────────────────────────────────── */
  function selecionarDia(id, { focar = false } = {}) {
    if (!dias.includes(id)) id = diaHoje;
    diaAtual = id;
    abas.forEach((aba) => {
      const ativo = aba.dataset.dia === id;
      aba.setAttribute("aria-selected", ativo ? "true" : "false");
      aba.tabIndex = ativo ? 0 : -1;
      if (ativo && focar) aba.focus();
    });
    paineis.forEach((p) => {
      p.hidden = p.dataset.dia !== id;
    });
    guardar(id);
    aplicarFiltros();
  }

  abas.forEach((aba, i) => {
    aba.addEventListener("click", () => selecionarDia(aba.dataset.dia));
    aba.addEventListener("keydown", (e) => {
      let destino = null;
      if (e.key === "ArrowRight") destino = (i + 1) % abas.length;
      else if (e.key === "ArrowLeft") destino = (i - 1 + abas.length) % abas.length;
      else if (e.key === "Home") destino = 0;
      else if (e.key === "End") destino = abas.length - 1;
      if (destino === null) return;
      e.preventDefault();
      selecionarDia(abas[destino].dataset.dia, { focar: true });
    });
  });

  /* ── Busca e filtros (aplicados no dia visível) ────────────── */
  function aplicarFiltros() {
    const termo = (busca ? busca.value : "").trim().toLowerCase();
    const categoria = filtroCategoria ? filtroCategoria.value : "";
    const painel = paineis.find((p) => !p.hidden);
    if (!painel) return;

    const itens = Array.from(painel.querySelectorAll(".tk-item"));
    let visiveis = 0;
    itens.forEach((item) => {
      const titulo = (item.dataset.title || "").toLowerCase();
      const okBusca = !termo || titulo.includes(termo);
      const okCategoria = !categoria || item.dataset.cat === categoria;
      const okStatus = statusAtual === "all" || item.dataset.status === statusAtual;
      const mostrar = okBusca && okCategoria && okStatus;
      item.hidden = !mostrar;
      if (mostrar) visiveis += 1;
    });

    painel.querySelectorAll(".tk-period").forEach((periodo) => {
      const algum = periodo.querySelector(".tk-item:not([hidden])");
      periodo.hidden = !algum;
    });

    const semResultado = painel.querySelector(".tk-noresult");
    if (semResultado) semResultado.hidden = itens.length === 0 || visiveis > 0;
  }

  function limparFiltros() {
    if (busca) busca.value = "";
    if (filtroCategoria) filtroCategoria.value = "";
    definirStatus("all");
  }

  function definirStatus(valor) {
    statusAtual = valor;
    botoesStatus.forEach((b) => {
      const ativo = b.dataset.status === valor;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-pressed", ativo ? "true" : "false");
    });
    aplicarFiltros();
  }

  busca && busca.addEventListener("input", aplicarFiltros);
  filtroCategoria && filtroCategoria.addEventListener("change", aplicarFiltros);
  botoesStatus.forEach((b) =>
    b.addEventListener("click", () => definirStatus(b.dataset.status)),
  );
  raiz.addEventListener("click", (e) => {
    if (e.target.closest("[data-limpar]")) limparFiltros();
  });

  /* ── Formulário ────────────────────────────────────────────── */
  const form = document.getElementById("taskForm");
  const sheetTitulo = document.getElementById("sheetTitle");
  const sheetSub = document.getElementById("sheetSub");
  const botaoSalvar = document.getElementById("saveTaskButton");
  const textoSalvar = document.getElementById("saveTaskText");
  const iconeSalvar = botaoSalvar ? botaoSalvar.querySelector("i") : null;
  const grupoDia = document.getElementById("diaGroup");
  const maisOpcoes = document.getElementById("moreOptions");
  const sheet = window.hsSheet;

  if (!form || !sheet) return;

  const marcarRadio = (nome, valor) => {
    form.querySelectorAll(`input[name="${nome}"]`).forEach((r) => {
      r.checked = r.value === valor;
    });
  };
  const valorRadio = (nome) => {
    const r = form.querySelector(`input[name="${nome}"]:checked`);
    return r ? r.value : "";
  };

  function atualizarRepeticao() {
    const semanal = valorRadio("repeticao") === "weekly";
    // fieldset desativado não é enviado: só "Toda semana" manda dia_semana
    grupoDia.disabled = !semanal;
    if (!semanal) marcarRadio("dia_semana", "");
  }
  form.querySelectorAll('input[name="repeticao"]').forEach((r) =>
    r.addEventListener("change", () => {
      atualizarRepeticao();
      limparErro("dia_semana");
    }),
  );

  /* mensagens de erro por campo */
  function erroEl(nome) {
    return document.getElementById(`err-${nome}`);
  }
  function mostrarErro(nome, msg) {
    const el = erroEl(nome);
    if (el) {
      el.textContent = msg;
      el.hidden = false;
    }
    const campo = form.elements[nome];
    if (campo && campo.setAttribute && nome !== "dia_semana") {
      campo.setAttribute("aria-invalid", "true");
    }
  }
  function limparErro(nome) {
    const el = erroEl(nome);
    if (el) {
      el.textContent = "";
      el.hidden = true;
    }
    const campo = form.elements[nome];
    if (campo && campo.removeAttribute) campo.removeAttribute("aria-invalid");
  }
  const campos = ["titulo", "horario", "dia_semana", "data"];
  const limparErros = () => campos.forEach(limparErro);

  ["titulo", "horario", "data"].forEach((nome) => {
    const campo = form.elements[nome];
    campo && campo.addEventListener("input", () => limparErro(nome));
  });
  form.querySelectorAll('input[name="dia_semana"]').forEach((r) =>
    r.addEventListener("change", () => limparErro("dia_semana")),
  );

  function validar() {
    limparErros();
    const erros = [];
    const titulo = form.elements.titulo.value.trim();
    if (!titulo) erros.push(["titulo", "O título é obrigatório."]);
    else if (titulo.length < 2 || titulo.length > 200)
      erros.push(["titulo", "O título deve ter entre 2 e 200 caracteres."]);

    const horario = form.elements.horario.value;
    if (horario && !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario))
      erros.push(["horario", "Horário inválido."]);

    if (valorRadio("repeticao") === "weekly" && !valorRadio("dia_semana"))
      erros.push(["dia_semana", "Escolha o dia da semana."]);

    const data = form.elements.data.value;
    if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data))
      erros.push(["data", "Data inválida."]);

    erros.forEach(([nome, msg]) => mostrarErro(nome, msg));
    if (erros.length) {
      if (erros.some(([nome]) => nome === "data") && maisOpcoes) maisOpcoes.open = true;
      const primeiro = erros[0][0];
      const alvo =
        primeiro === "dia_semana"
          ? form.querySelector('input[name="dia_semana"]')
          : form.elements[primeiro];
      alvo && alvo.focus();
    }
    return erros.length === 0;
  }

  function preparar(modo, dados) {
    form.reset();
    limparErros();
    botaoSalvar.disabled = false;

    const editando = modo === "editar";
    form.action = editando ? `/tasks/atualizar/${dados.id}` : "/tasks/criar";
    sheetTitulo.textContent = editando ? "Editar tarefa" : "Nova tarefa";
    sheetSub.textContent = editando
      ? "Ajuste os detalhes da sua tarefa."
      : "Organize sua rotina de forma simples.";
    textoSalvar.textContent = editando ? "Atualizar tarefa" : "Salvar tarefa";
    if (iconeSalvar)
      iconeSalvar.className = editando ? "bi bi-pencil-square" : "bi bi-plus-circle-fill";

    form.elements.titulo.value = dados.titulo || "";
    form.elements.descricao.value = dados.descricao || "";
    form.elements.categoria.value = dados.categoria || "geral";
    form.elements.horario.value = dados.horario || "";
    form.elements.data.value = dados.data || "";
    marcarRadio("repeticao", dados.repeticao || "weekly");
    atualizarRepeticao();
    if (valorRadio("repeticao") === "weekly") marcarRadio("dia_semana", dados.dia || diaAtual);
    if (maisOpcoes) maisOpcoes.open = !!dados.data;
  }

  const dadosDoItem = (item) => ({
    id: item.dataset.id,
    titulo: item.dataset.title,
    descricao: item.dataset.descricao,
    categoria: item.dataset.cat,
    data: item.dataset.data,
    horario: item.dataset.horario,
    repeticao: item.dataset.repeticao,
    dia: item.dataset.diaSemana,
  });

  function abrirNova(dia) {
    preparar("criar", { repeticao: "weekly", dia: dia || diaAtual });
    sheet.abrir();
  }

  // "Nova tarefa" (cabeçalho, botão flutuante e estado vazio do dia)
  document.querySelectorAll("[data-nova]").forEach((botao) =>
    botao.addEventListener("click", () => abrirNova(botao.dataset.dia)),
  );

  // Editar sem recarregar a página; com Ctrl/Cmd o link abre normalmente
  raiz.addEventListener("click", (e) => {
    const link = e.target.closest("[data-editar]");
    if (!link) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    const item = link.closest(".tk-item");
    if (!item) return;
    preparar("editar", dadosDoItem(item));
    sheet.abrir();
  });

  // Envio: valida antes e evita clique duplo
  form.addEventListener("submit", (e) => {
    if (!validar()) {
      e.preventDefault();
      return;
    }
    botaoSalvar.disabled = true;
    textoSalvar.textContent = "Salvando...";
  });

  /* ── Exclusão com confirmação ──────────────────────────────── */
  const dialogo = document.getElementById("confirmDelete");
  const formExcluir = document.getElementById("deleteForm");
  const textoConfirma = document.getElementById("confirmText");
  const cancelarExcluir = document.getElementById("cancelDelete");

  raiz.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-excluir]");
    if (!botao) return;
    const item = botao.closest(".tk-item");
    if (!item) return;
    const acao = `/tasks/excluir/${item.dataset.id}`;

    if (!dialogo || typeof dialogo.showModal !== "function") {
      // navegador sem <dialog>: confirmação nativa
      if (window.confirm(`Excluir "${item.dataset.title}"?`)) {
        const f = document.createElement("form");
        f.method = "POST";
        f.action = acao;
        document.body.appendChild(f);
        f.submit();
      }
      return;
    }
    formExcluir.action = acao;
    textoConfirma.textContent = `"${item.dataset.title}" será removida. Essa ação não pode ser desfeita.`;
    dialogo.showModal();
  });

  cancelarExcluir && cancelarExcluir.addEventListener("click", () => dialogo.close());
  dialogo &&
    dialogo.addEventListener("click", (e) => {
      if (e.target === dialogo) dialogo.close(); // clique no fundo
    });

  /* ── Estado inicial ────────────────────────────────────────── */
  const params = new URLSearchParams(window.location.search);
  const guardado = lerGuardado();
  selecionarDia(guardado && dias.includes(guardado) ? guardado : diaHoje);
  definirStatus("all");

  // Edição vinda do servidor (/tasks/editar/:id): abre o formulário preenchido
  const tarefaEdicao = window.taskToEdit;
  if (tarefaEdicao && document.body.dataset.editMode === "true") {
    preparar("editar", {
      id: tarefaEdicao._id,
      titulo: tarefaEdicao.title,
      descricao: tarefaEdicao.descricao,
      categoria: tarefaEdicao.categoria,
      data: tarefaEdicao.data,
      horario: tarefaEdicao.horario ? String(tarefaEdicao.horario).slice(0, 5) : "",
      repeticao: tarefaEdicao.repeticao,
      dia: tarefaEdicao.dia_semana,
    });
    sheet.abrir();
  }

  // Abrir via /tasks?nova=1 (botões "Nova tarefa" do dashboard)
  if (params.get("nova") === "1") {
    abrirNova(diaHoje);
    params.delete("nova");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : ""),
    );
  }

  /* ── Aviso de feedback (flash) ─────────────────────────────── */
  const flash = document.getElementById("flash-msg");
  if (flash) {
    setTimeout(() => {
      flash.classList.add("hs-flash--saindo");
      setTimeout(() => flash.remove(), 300);
    }, 3500);
  }
});
