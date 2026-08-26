const btnBiometria = document.getElementById("btn-cadastrar-biometria");

if (btnBiometria) {
  btnBiometria.addEventListener("click", async () => {
    try {
      // Impede o cadastro pelo computador
      if (window.innerWidth > 768) {
        alert("O cadastro da biometria deve ser realizado pelo celular.");
        return;
      }

      // Verifica suporte ao WebAuthn
      if (!window.PublicKeyCredential) {
        alert(
          "Seu dispositivo ou navegador não oferece suporte à biometria."
        );
        return;
      }

      btnBiometria.disabled = true;
      btnBiometria.textContent = "Aguarde...";

      // Solicita as opções de cadastro ao servidor
      const respostaOpcoes = await fetch("/webauthn/register/options", {
        method: "POST",
        credentials: "include",
      });

      const options = await respostaOpcoes.json();

      if (!respostaOpcoes.ok) {
        throw new Error(options.erro || "Erro ao iniciar cadastro.");
      }

      // Abre o sistema de biometria do dispositivo
      const resultado =
        await window.SimpleWebAuthnBrowser.startRegistration({
          optionsJSON: options,
        });

      // Envia a credencial para o servidor verificar
      const respostaVerificacao = await fetch(
        "/webauthn/register/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(resultado),
        }
      );

      const dados = await respostaVerificacao.json();

      if (!respostaVerificacao.ok) {
        throw new Error(
          dados.erro || "Não foi possível cadastrar a biometria."
        );
      }

      // Cadastro concluído
      alert("Biometria cadastrada com sucesso!");

      btnBiometria.textContent = "Cadastrada";
      btnBiometria.disabled = true;

    } catch (error) {
      console.error("Erro ao cadastrar biometria:", error);

      alert(
        error.message || "Erro ao cadastrar biometria."
      );

      btnBiometria.disabled = false;
      btnBiometria.textContent = "Cadastrar";
    }
  });
}