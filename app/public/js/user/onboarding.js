// =====================================
// HEALTHY SAFELY - ONBOARDING
// =====================================

const etapas = document.querySelectorAll(".step");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

let etapaAtual = 0;

const respostas = {
  objetivo: "",
  dificuldade: "",
  tempo: "",
  periodo: "",
  dias: [],
  tarefasDia: "",
  lembretes: "",
};

function etapaPodeAvancar(indice) {
  if (indice === 0 || indice === etapas.length - 1) {
    return true;
  }

  return Boolean(etapas[indice].querySelector(".option.selected"));
}

function atualizarBotoes() {
  document.querySelectorAll(".btn-next").forEach((botao) => {
    const etapa = botao.closest(".step");
    const indice = Array.from(etapas).indexOf(etapa);

    botao.disabled = !etapaPodeAvancar(indice);
  });
}

// =====================================
// INICIAR
// =====================================

mostrarEtapa(0);

// =====================================
// MOSTRAR ETAPA
// =====================================

function mostrarEtapa(indice) {
  etapas.forEach((step) => step.classList.remove("active"));

  etapas[indice].classList.add("active");

  etapaAtual = indice;

  atualizarProgresso();
  atualizarBotoes();

  if (indice === 8) {
    setTimeout(async () => {
      try {
        await fetch("/onboarding/concluir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(respostas),
        });
      } catch (error) {
        console.error("Erro ao concluir onboarding:", error);
      }
      
      window.location = "/dashboard";
    }, 3200);
  }
}

// =====================================
// BARRA
// =====================================

function atualizarProgresso() {
  const porcentagem = ((etapaAtual + 1) / etapas.length) * 100;

  progressFill.style.width = porcentagem + "%";

  progressText.textContent = `Passo ${etapaAtual + 1} de ${etapas.length}`;
}

// =====================================
// BOTÕES CONTINUAR
// =====================================

document.querySelectorAll(".btn-next").forEach((botao) => {
  botao.addEventListener("click", () => {
    if (etapaAtual < etapas.length - 1 && etapaPodeAvancar(etapaAtual)) {
      mostrarEtapa(etapaAtual + 1);
    }
  });
});

// =====================================
// OPÇÕES
// =====================================

document
  .querySelectorAll(".hs-onboarding-options")
  .forEach((grupo, indiceGrupo) => {
    const opcoes = grupo.querySelectorAll(".option");

    opcoes.forEach((opcao) => {
      if (opcao.classList.contains("day")) {
        return;
      }

      opcao.addEventListener("click", () => {
        opcoes.forEach((o) => o.classList.remove("selected"));

        opcao.classList.add("selected");

        const valor = opcao.textContent.trim();

        switch (indiceGrupo) {
          case 0:
            respostas.objetivo = valor;
            break;

          case 1:
            respostas.dificuldade = valor;
            break;

          case 2:
            respostas.tempo = valor;
            break;

          case 3:
            respostas.periodo = valor;
            break;

          case 4:
            respostas.tarefasDia = valor;
            break;

          case 5:
            respostas.lembretes = valor;
            break;
        }

        console.clear();
        console.log(respostas);
        atualizarBotoes();
      });
    });
  });

// =====================================
// DIAS DA SEMANA
// =====================================

document.querySelectorAll(".option.day").forEach((botao) => {
  botao.addEventListener("click", () => {
    botao.classList.toggle("selected");

    const dia = botao.textContent;

    if (respostas.dias.includes(dia)) {
      respostas.dias = respostas.dias.filter((d) => d !== dia);
    } else {
      respostas.dias.push(dia);
    }

    console.clear();
    console.log(respostas);
    atualizarBotoes();
  });
});
