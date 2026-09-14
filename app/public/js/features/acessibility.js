// =====================================
// MENU ACESSIBILIDADE
// =====================================

const botaoAcessibilidade = document.getElementById("abrirAcessibilidade");

const menuAcessibilidade = document.getElementById("menuAcessibilidade");

const menuMaisOpcoes = document.getElementById("menuMaisOpcoes");

const voltarAcessibilidade = document.getElementById("voltarAcessibilidade");

// Abrir acessibilidade
if (botaoAcessibilidade && menuAcessibilidade) {
  botaoAcessibilidade.addEventListener("click", (e) => {
    e.stopPropagation();

    // Fecha o menu dos três pontos
    if (menuMaisOpcoes) {
      menuMaisOpcoes.classList.remove("aberto");
    }

    // Abre o menu de acessibilidade
    menuAcessibilidade.classList.add("ativo");
  });
}

// Voltar para o menu dos três pontos
if (voltarAcessibilidade) {
  voltarAcessibilidade.addEventListener("click", (e) => {
    e.stopPropagation();

    // Fecha acessibilidade
    menuAcessibilidade.classList.remove("ativo");

    // Abre novamente o menu dos três pontos
    if (menuMaisOpcoes) {
      menuMaisOpcoes.classList.add("aberto");
    }
  });
}

// Fechar acessibilidade ao clicar fora
document.addEventListener("click", (e) => {
  if (
    menuAcessibilidade &&
    menuAcessibilidade.classList.contains("ativo") &&
    !menuAcessibilidade.contains(e.target)
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

  if (toggleDarkMode.checked) {
    document.documentElement.classList.add("dark");
  }

  toggleDarkMode.addEventListener("change", () => {
    if (toggleDarkMode.checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("hs_tema", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("hs_tema", "light");
    }
  });
}

// =====================================
// TAMANHO DA FONTE
// =====================================

const aumentarFonte = document.getElementById("aumentarFonte");
const diminuirFonte = document.getElementById("diminuirFonte");

let tamanhoFonte = Number(localStorage.getItem("tamanhoFonte") ?? 2);

// aplicar ao carregar
document.documentElement.classList.toggle(
  "fonte-minuscula",
  tamanhoFonte === 0,
);

document.documentElement.classList.toggle("fonte-pequena", tamanhoFonte === 1);

document.documentElement.classList.toggle("fonte-padrao", tamanhoFonte === 2);

document.documentElement.classList.toggle("fonte-grande", tamanhoFonte === 3);

document.documentElement.classList.toggle("fonte-gigante", tamanhoFonte === 4);

if (aumentarFonte) {
  aumentarFonte.addEventListener("click", () => {
    if (tamanhoFonte < 4) {
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

const classesFonte = [
  "fonte-minuscula",
  "fonte-pequena",
  "fonte-padrao",
  "fonte-grande",
  "fonte-gigante",
];

function aplicarFonte() {
  document.documentElement.classList.remove(...classesFonte);

  document.documentElement.classList.add(classesFonte[tamanhoFonte]);

  localStorage.setItem("tamanhoFonte", tamanhoFonte);
}

// =====================================
// ALTO CONTRASTE
// =====================================

if (toggleContraste) {
  toggleContraste.checked = localStorage.getItem("contraste") === "true";

  if (toggleContraste.checked) {
    document.documentElement.classList.add("contraste");
  }

  toggleContraste.addEventListener("change", () => {
    if (toggleContraste.checked) {
      document.documentElement.classList.add("contraste");

      localStorage.setItem("contraste", "true");
    } else {
      document.documentElement.classList.remove("contraste");

      localStorage.setItem("contraste", "false");
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
