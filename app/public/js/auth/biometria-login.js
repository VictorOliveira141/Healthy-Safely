const btnBiometria = document.getElementById("btn-biometria");

if (btnBiometria && window.PublicKeyCredential) {
  btnBiometria.style.display = "block";

  btnBiometria.addEventListener("click", async () => {
    try {
      btnBiometria.disabled = true;
      btnBiometria.innerHTML =
        '<i class="bi bi-fingerprint"></i> Verificando...';

      const respostaOpcoes = await fetch("/webauthn/login/options", {
        method: "POST",
        credentials: "include",
      });

      if (!respostaOpcoes.ok) {
        throw new Error("Não foi possível iniciar a autenticação.");
      }

      const options = await respostaOpcoes.json();

      const { startAuthentication } = SimpleWebAuthnBrowser;

      const resultado = await startAuthentication({
        optionsJSON: options,
      });

      const respostaLogin = await fetch("/webauthn/login/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(resultado),
      });

      const dados = await respostaLogin.json();

      if (!respostaLogin.ok) {
        throw new Error(dados.erro || "Falha na autenticação.");
      }

      window.location.href = dados.redirect;
    } catch (error) {
      console.error("Erro no login biométrico:", error);
      alert(error.message || "Não foi possível entrar com a biometria.");
    } finally {
      btnBiometria.disabled = false;
      btnBiometria.innerHTML =
        '<i class="bi bi-fingerprint"></i> Entrar com biometria';
    }
  });
}