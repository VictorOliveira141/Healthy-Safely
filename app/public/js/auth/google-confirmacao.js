/* js para validação front-end na página de confirmação do google */

$(function () {
  const $form = $(".form-multistep");

  if (!$form.length) return;

  const $nome = $("#nome");
  const $nomeusuario = $("#nomeusuario");
  const $senha = $("#senha");
  const $confirmarSenha = $("#confirmarSenha");
  const $botao = $form.find('button[type="submit"]');

  let usernameDisponivel = false;
  let debounce;

  function setErro($input, mensagem = "") {
    let $msg = $input.next(".msg-erro");

    if (!$msg.length && $input.closest(".campo-senha").length) {
      $msg = $input.closest(".campo-senha").next(".msg-erro");
    }

    if (!$msg.length) return;

    if (mensagem) {
      $input.addClass("erro-input");
      $msg.text(mensagem).show();
    } else {
      $input.removeClass("erro-input");
      $msg.text("").hide();
    }
  }

  function validarNome() {
    const valor = $nome.val().trim();

    if (!valor) {
      setErro($nome, "Informe seu nome.");
      return false;
    }

    if (
      valor.length < 3 ||
      valor.length > 50 ||
      !/^[A-Za-zÀ-ú\s]+$/.test(valor)
    ) {
      setErro($nome, "Nome inválido.");
      return false;
    }

    setErro($nome);
    return true;
  }

  function validarUsuario() {
    const valor = $nomeusuario.val().trim();

    if (!valor) {
      setErro($nomeusuario, "Escolha um nome de usuário.");
      usernameDisponivel = false;
      atualizarBotao();
      return;
    }

    if (
      valor.length < 3 ||
      valor.length > 30 ||
      !/^[a-zA-Z0-9_-]+$/.test(valor)
    ) {
      setErro(
        $nomeusuario,
        "Use apenas letras, números, hífen e underscore."
      );
      usernameDisponivel = false;
      atualizarBotao();
      return;
    }

    clearTimeout(debounce);

    debounce = setTimeout(() => {
      $.get("/api/cadastro/disponibilidade", { nomeusuario: valor })
        .done((res) => {
          if (
            res.nomeusuario &&
            !res.nomeusuario.disponivel
          ) {
            usernameDisponivel = false;
            setErro(
              $nomeusuario,
              "Nome de usuário indisponível."
            );
          } else {
            usernameDisponivel = true;
            setErro($nomeusuario);
          }

          atualizarBotao();
        })
        .fail(() => {
          usernameDisponivel = false;
          atualizarBotao();
        });
    }, 300);
  }

  function validarSenha() {
    const senha = $senha.val();

    if (!senha) {
      setErro($senha, "Informe uma senha.");
      return false;
    }

    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(senha)) {
      setErro(
        $senha,
        "Use 8+ caracteres, letra maiúscula, número e símbolo."
      );
      return false;
    }

    setErro($senha);
    return true;
  }

  function validarConfirmacao() {
    const senha = $senha.val();
    const confirmar = $confirmarSenha.val();

    if (!confirmar) {
      setErro($confirmarSenha, "Confirme sua senha.");
      return false;
    }

    if (senha !== confirmar) {
      setErro($confirmarSenha, "As senhas não coincidem.");
      return false;
    }

    setErro($confirmarSenha);
    return true;
  }

  function atualizarBotao() {
    const ok =
      validarNome() &&
      validarSenha() &&
      validarConfirmacao() &&
      usernameDisponivel;

    $botao.prop("disabled", !ok);
  }

  $nome.on("input", atualizarBotao);

  $senha.on("input", () => {
    validarSenha();
    validarConfirmacao();
    atualizarBotao();
  });

  $confirmarSenha.on("input", () => {
    validarConfirmacao();
    atualizarBotao();
  });

  $nomeusuario.on("input", validarUsuario);

  $form.on("submit", function (e) {
    atualizarBotao();

    if ($botao.prop("disabled")) {
      e.preventDefault();
    }
  });

  $botao.prop("disabled", true);
});