document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal-editar-perfil");
  const btnAbrir = document.getElementById("btn-editar-perfil");
  const btnFechar = modal?.querySelectorAll("[data-modal-fechar]");
  const form = document.getElementById("form-editar-perfil");

  if (!modal || !btnAbrir || !form) return;

  // =========================
  // ELEMENTOS DO FORMULÁRIO
  // =========================

  const inputFoto = document.getElementById("foto-perfil");
  const previewFoto = document.getElementById("preview-foto-perfil");
  const previewInicial = document.getElementById("preview-inicial-perfil");

  const nomeusuarioInput = document.getElementById("nomeusuario");
  const statusNomeusuario = document.getElementById("status-nomeusuario");

  // =========================
  // MODAL
  // =========================

  const abrirModal = () => {
    modal.classList.add("ativo");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    const primeiroCampo = modal.querySelector(
      'input:not([type="file"]), select, textarea, button',
    );

    primeiroCampo?.focus();
  };

  const fecharModal = () => {
    modal.classList.remove("ativo");
    modal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
  };

  btnAbrir.addEventListener("click", abrirModal);

  btnFechar?.forEach((btn) => {
    btn.addEventListener("click", fecharModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("ativo")) {
      fecharModal();
    }
  });

  // =========================
  // PREVIEW DA FOTO
  // =========================

  inputFoto?.addEventListener("change", () => {
    const arquivo = inputFoto.files?.[0];

    if (!arquivo) return;

    const url = URL.createObjectURL(arquivo);

    // Se já existe uma imagem, apenas troca o src
    if (previewFoto) {
      previewFoto.src = url;
      previewFoto.onload = () => {
        URL.revokeObjectURL(url);
      };
      return;
    }

    // Se não existe imagem, cria uma
    // e substitui a inicial do usuário.
    if (previewInicial) {
      const novaImagem = document.createElement("img");

      novaImagem.id = "preview-foto-perfil";
      novaImagem.src = url;
      novaImagem.alt = "Pré-visualização da foto de perfil";

      previewInicial.replaceWith(novaImagem);

      novaImagem.onload = () => {
        URL.revokeObjectURL(url);
      };
    }
  });

  // =========================
  // DISPONIBILIDADE
  // =========================

  let timeoutNomeusuario = null;

  if (nomeusuarioInput && statusNomeusuario) {
    const nomeUsuarioOriginal = nomeusuarioInput.value.trim();

    const limparStatusNomeusuario = () => {
      statusNomeusuario.textContent = "";
      statusNomeusuario.className = "status-nomeusuario";
    };

    const mostrarStatusNomeusuario = (mensagem, tipo) => {
      statusNomeusuario.textContent = mensagem;
      statusNomeusuario.className = `status-nomeusuario ${tipo}`;
    };

    const verificarNomeusuario = async () => {
      const valor = nomeusuarioInput.value.trim();

      // Voltou para o nome de usuário original
      if (valor === nomeUsuarioOriginal) {
        limparStatusNomeusuario();
        return;
      }

      // Menos de 3 caracteres
      if (valor.length < 3) {
        limparStatusNomeusuario();
        return;
      }

      // Mesma validação utilizada no backend
      if (valor.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(valor)) {
        mostrarStatusNomeusuario(
          "Use apenas letras, números, hífen e underscore.",
          "erro",
        );
        return;
      }

      mostrarStatusNomeusuario("Verificando...", "verificando");

      try {
        const resposta = await fetch(
          `/api/configuracoes/disponibilidade?nomeusuario=${encodeURIComponent(
            valor,
          )}`,
        );

        if (!resposta.ok) {
          throw new Error("Falha ao verificar disponibilidade.");
        }

        const dados = await resposta.json();

        if (dados.nomeusuario?.disponivel) {
          mostrarStatusNomeusuario(
            "✓ Nome de usuário disponível",
            "disponivel",
          );
        } else {
          mostrarStatusNomeusuario(
            "✕ Nome de usuário já está em uso",
            "indisponivel",
          );
        }
      } catch (erro) {
        console.error("Erro ao verificar nome de usuário:", erro);

        mostrarStatusNomeusuario("Não foi possível verificar agora.", "erro");
      }
    };

    nomeusuarioInput.addEventListener("input", () => {
      clearTimeout(timeoutNomeusuario);

      limparStatusNomeusuario();

      timeoutNomeusuario = setTimeout(() => {
        verificarNomeusuario();
      }, 400);
    });
  }

  // =========================
  // ENVIO DO FORMULÁRIO
  // =========================

  form.addEventListener("submit", () => {
    const botaoSalvar = form.querySelector(".btn-salvar-config");

    if (!botaoSalvar) return;

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";
  });
});
