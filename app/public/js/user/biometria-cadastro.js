const btnBiometria = document.getElementById(
  "btn-cadastrar-biometria",
);

const statusBiometria = document.getElementById(
  "status-biometria",
);


// ============================================================
// Verificar status
// ============================================================

async function verificarStatusBiometria() {
  if (!statusBiometria || !btnBiometria) return;

  try {
    const resposta = await fetch("/webauthn/status", {
      method: "GET",
      credentials: "include",
    });

    if (!resposta.ok) {
      throw new Error(
        "Não foi possível verificar o status da biometria.",
      );
    }

    const dados = await resposta.json();

    if (dados.status) {
      statusBiometria.textContent = "Ativada";

      statusBiometria.classList.remove("nao-ativada");
      statusBiometria.classList.add("ativada");

      btnBiometria.textContent = "Remover";
    } else {
      statusBiometria.textContent = "Não ativada";

      statusBiometria.classList.remove("ativada");
      statusBiometria.classList.add("nao-ativada");

      btnBiometria.textContent = "Cadastrar";
    }
  } catch (error) {
    console.error(
      "Erro ao verificar status da biometria:",
      error,
    );
  }
}


// ============================================================
// Remover biometria
// ============================================================

async function removerBiometria() {
  const confirmar = confirm(
    "Tem certeza que deseja remover a biometria cadastrada?",
  );

  if (!confirmar) return;

  try {
    btnBiometria.disabled = true;
    btnBiometria.textContent = "Removendo...";

    const resposta = await fetch("/webauthn/remove", {
      method: "DELETE",
      credentials: "include",
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro || "Não foi possível remover a biometria.",
      );
    }

    statusBiometria.textContent = "Não ativada";

    statusBiometria.classList.remove("ativada");
    statusBiometria.classList.add("nao-ativada");

    btnBiometria.textContent = "Cadastrar";
    btnBiometria.disabled = false;

    alert("Biometria removida com sucesso!");
  } catch (error) {
    console.error(
      "Erro ao remover biometria:",
      error,
    );

    alert(
      error.message ||
        "Não foi possível remover a biometria.",
    );

    btnBiometria.disabled = false;
    btnBiometria.textContent = "Remover";
  }
}


// ============================================================
// Cadastrar biometria
// ============================================================

async function cadastrarBiometria() {
  try {
    if (window.innerWidth > 768) {
      alert(
        "O cadastro da biometria deve ser realizado pelo celular.",
      );
      return;
    }

    if (!window.PublicKeyCredential) {
      alert(
        "Seu dispositivo ou navegador não oferece suporte à biometria.",
      );
      return;
    }

    btnBiometria.disabled = true;
    btnBiometria.textContent = "Aguarde...";

    const respostaOpcoes = await fetch(
      "/webauthn/register/options",
      {
        method: "POST",
        credentials: "include",
      },
    );

    const options = await respostaOpcoes.json();

    if (!respostaOpcoes.ok) {
      throw new Error(
        options.erro || "Erro ao iniciar cadastro.",
      );
    }

    const resultado =
      await window.SimpleWebAuthnBrowser.startRegistration({
        optionsJSON: options,
      });

    const respostaVerificacao = await fetch(
      "/webauthn/register/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(resultado),
      },
    );

    const dados = await respostaVerificacao.json();

    if (!respostaVerificacao.ok) {
      throw new Error(
        dados.erro ||
          "Não foi possível cadastrar a biometria.",
      );
    }

    alert("Biometria cadastrada com sucesso!");

    statusBiometria.textContent = "Ativada";

    statusBiometria.classList.remove("nao-ativada");
    statusBiometria.classList.add("ativada");

    btnBiometria.textContent = "Remover";
    btnBiometria.disabled = false;
  } catch (error) {
    console.error(
      "Erro ao cadastrar biometria:",
      error,
    );

    alert(
      error.message ||
        "Erro ao cadastrar biometria.",
    );

    btnBiometria.disabled = false;
    btnBiometria.textContent = "Cadastrar";
  }
}


// ============================================================
// Clique do botão
// ============================================================

if (btnBiometria) {
  btnBiometria.addEventListener("click", async () => {
    if (btnBiometria.textContent.trim() === "Remover") {
      await removerBiometria();
    } else {
      await cadastrarBiometria();
    }
  });
}


// ============================================================
// Verificar ao abrir a página
// ============================================================

verificarStatusBiometria();