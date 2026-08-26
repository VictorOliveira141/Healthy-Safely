const btnBiometria = document.getElementById("btn-cadastrar-biometria");

if (btnBiometria) {
  btnBiometria.addEventListener("click", async () => {
    try {
      if (!window.PublicKeyCredential) {
        alert("Seu dispositivo ou navegador não oferece suporte à biometria.");
        return;
      }

      btnBiometria.disabled = true;
      btnBiometria.textContent = "Aguarde...";

      const respostaOpcoes = await fetch("/webauthn/register/options", {
        method: "POST",
        credentials: "include",
      });

      const options = await respostaOpcoes.json();

      if (!respostaOpcoes.ok) {
        throw new Error(options.erro || "Erro ao iniciar cadastro.");
      }

      const { startRegistration } = SimpleWebAuthnBrowser;

      const resultado = await startRegistration({
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
          dados.erro || "Não foi possível cadastrar a biometria.",
        );
      }

      alert("Biometria cadastrada com sucesso!");

      btnBiometria.textContent = "Cadastrada";
    } catch (error) {
      console.error("Erro ao cadastrar biometria:", error);

      alert(error.message || "Erro ao cadastrar biometria.");

      btnBiometria.disabled = false;
      btnBiometria.textContent = "Cadastrar";
    }
  });
}