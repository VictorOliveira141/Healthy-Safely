// =====================================
// MENU ACESSIBILIDADE
// =====================================

const botaoAcessibilidade = document.getElementById("btnAcessibilidade");
const menuAcessibilidade = document.getElementById("menuAcessibilidade");

botaoAcessibilidade.addEventListener("click", (e) => {
  e.stopPropagation();

  menuAcessibilidade.classList.toggle("ativo");
});

document.addEventListener("click", (e) => {
  if (
    !menuAcessibilidade.contains(e.target) &&
    !botaoAcessibilidade.contains(e.target)
  ) {
    menuAcessibilidade.classList.remove("ativo");
  }
});

// =====================================
// MODO ESCURO
// =====================================

const toggleDarkMode = document.getElementById("toggleDarkMode");
const toggleContraste = document.getElementById("toggleContraste");

// carregar estado salvo
if (toggleDarkMode) {
  toggleDarkMode.checked = localStorage.getItem("hs_tema") === "dark";

  toggleDarkMode.addEventListener("change", () => {
    if (toggleDarkMode.checked) {
      // desativa contraste
      document.documentElement.classList.remove("contraste");

      if (toggleContraste) {
        toggleContraste.checked = false;
      }

      localStorage.setItem("contraste", "false");

      localStorage.setItem("hs_tema", "dark");

      document.documentElement.classList.add("dark");
    } else {
      localStorage.setItem("hs_tema", "light");

      document.documentElement.classList.remove("dark");
    }
  });
}

// =====================================
// TAMANHO DA FONTE
// =====================================

const aumentarFonte = document.getElementById("aumentarFonte");
const diminuirFonte = document.getElementById("diminuirFonte");

let tamanhoFonte = Number(localStorage.getItem("tamanhoFonte") || 0);

// aplicar ao carregar

document.documentElement.classList.toggle("fonte-media", tamanhoFonte === 1);

document.documentElement.classList.toggle("fonte-grande", tamanhoFonte === 2);

if (aumentarFonte) {
  aumentarFonte.addEventListener("click", () => {
    if (tamanhoFonte < 2) {
      tamanhoFonte++;
    }

    aplicarFonte();
  });
}

if (diminuirFonte) {
  diminuirFonte.addEventListener("click", () => {
    if (tamanhoFonte > 0) {
      tamanhoFonte--;
    }

    aplicarFonte();
  });
}

function aplicarFonte() {
  document.documentElement.classList.remove("fonte-media", "fonte-grande");

  if (tamanhoFonte === 1) {
    document.documentElement.classList.add("fonte-media");
  }

  if (tamanhoFonte === 2) {
    document.documentElement.classList.add("fonte-grande");
  }

  localStorage.setItem("tamanhoFonte", tamanhoFonte);
}

// =====================================
// ALTO CONTRASTE
// =====================================

if (toggleContraste) {
  toggleContraste.checked = localStorage.getItem("contraste") === "true";

  toggleContraste.addEventListener("change", () => {
    if (toggleContraste.checked) {
      // desativa dark mode
      document.documentElement.classList.remove("dark");

      if (toggleDarkMode) {
        toggleDarkMode.checked = false;
      }

      localStorage.setItem("hs_tema", "light");

      localStorage.setItem("contraste", "true");

      document.documentElement.classList.add("contraste");
    } else {
      localStorage.setItem("contraste", "false");

      document.documentElement.classList.remove("contraste");
    }
  });
}

// =====================================
// REDUZIR ANIMAÇÕES
// =====================================

const toggleAnimacoes = document.getElementById("toggleAnimacoes");

if (toggleAnimacoes) {
  toggleAnimacoes.addEventListener("change", () => {
    document.documentElement.classList.toggle(
      "sem-animacao",
      toggleAnimacoes.checked,
    );

    localStorage.setItem("semAnimacao", toggleAnimacoes.checked);
  });

  if (localStorage.getItem("semAnimacao") === "true") {
    toggleAnimacoes.checked = true;

    document.documentElement.classList.add("sem-animacao");
  }
}

// =====================================
// LEITOR DE TELA
// =====================================

const toggleLeitor = document.getElementById("toggleLeitor");

if (toggleLeitor) {
  toggleLeitor.addEventListener("change", () => {
    if (toggleLeitor.checked) {
      const textoPagina = document.body.innerText;

      const leitura = new SpeechSynthesisUtterance(textoPagina);

      leitura.lang = "pt-BR";

      speechSynthesis.cancel();

      speechSynthesis.speak(leitura);
    } else {
      speechSynthesis.cancel();
    }
  });
}
