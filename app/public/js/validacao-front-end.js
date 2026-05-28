$(document).ready(function () {
  // ============ VALIDAÇÕES EM TEMPO REAL (BLUR) ============

  // CLIENTE
  $("form input[name='email']").on("blur", function () {
    validarCampo(this, validarEmail);
  });

  $("form input[name='senha']").on("blur", function () {
    validarCampo(this, validarSenha);
  });

  $("form input[name='confirmarSenha']").on("blur", function () {
    validarConfirmarSenha(this);
  });

  $("form input[name='nome']").on("blur", function () {
    validarCampo(this, validarNome);
  });

  $("form input[name='nomeusuario']").on("blur", function () {
    validarCampo(this, validarNomeUsuario);
  });

  // PROFISSIONAL
  $("form input[name='cref']").on("blur", function () {
    validarCampo(this, validarCref);
  });

  $("form select[name='areaAtuacao']").on("change blur", function () {
    validarSelect(this);
  });

  $("form input[name='tempoExperiencia']").on("blur", function () {
    validarCampo(this, validarTempoExperiencia);
  });

  $("form input[name='especialidades']").on("blur", function () {
    validarCampo(this, validarEspecialidades);
  });

  //login
  $("form input[name='email-login']").on("blur", function () {
    validarCampo(this, validarEmailLogin);
  });

  $("form input[name='senha-login']").on("blur", function () {
    validarCampo(this, validarSenhaLogin);
  });

  // ============ SUBMIT FORM ============
  $("form").on("submit", function (e) {
    const inputs = $(this).find("input, select, textarea");

    let isValid = true;

    inputs.each(function () {
      if (!validarCampoAoSubmit(this)) {
        isValid = false;
      }
    });

    if (!isValid) {
      e.preventDefault();
      mostrarMensagemErro("Por favor, corrija os erros acima");
    }
  });

  // ============ ENTER CONTROL ============
  $("form").on("keydown", function (e) {
    if (e.key === "Enter") {
      const inputs = $(this).find("input, select, textarea");

      let isValid = true;

      inputs.each(function () {
        if (!validarCampoAoSubmit(this)) {
          isValid = false;
        }
      });

      if (!isValid) {
        e.preventDefault();
        mostrarMensagemErro("Por favor, corrija os erros acima");
      }
    }
  });

  // ============ FUNÇÕES AUXILIARES ============
  function validarCampo(input, validarFuncao) {
    const $input = $(input);
    const resultado = validarFuncao($input.val().trim());

    if (resultado.valido) {
      mostrarSucesso($input);
    } else {
      mostrarErro($input, resultado.mensagem);
    }
  }

  function validarCampoAoSubmit(input) {
    const $input = $(input);
    const name = $input.attr("name");
    const valor = $input.val()?.trim();

    switch (name) {
      case "email":
        return processarValidacao($input, validarEmail(valor));

      case "senha":
        return processarValidacao($input, validarSenha(valor));

      case "confirmarSenha":
        return validarConfirmarSenha(input);

      case "nome":
        return processarValidacao($input, validarNome(valor));

      case "nomeusuario":
        return processarValidacao($input, validarNomeUsuario(valor));

      case "cref":
        return processarValidacao($input, validarCref(valor));

      case "areaAtuacao":
        return validarSelect(input);

      case "tempoExperiencia":
        return processarValidacao($input, validarTempoExperiencia(valor));

      case "especialidades":
        return processarValidacao($input, validarEspecialidades(valor));

      case "bio":
        return processarValidacao($input, validarBio(valor));

      default:
        return true;
    }
  }

  function processarValidacao($input, resultado) {
    if (resultado.valido) {
      mostrarSucesso($input);
      return true;
    } else {
      mostrarErro($input, resultado.mensagem);
      return false;
    }
  }

  // ============ VALIDADORES ============

  // CLIENTE
  function validarEmail(valor) {
    if (!valor)
      return { valido: false, mensagem: "⚠️Este campo é obrigatório." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor))
      return { valido: false, mensagem: "⚠️E-mail inválido." };
    return { valido: true, mensagem: "" };
  }

  function validarSenha(valor) {
    if (!valor)
      return { valido: false, mensagem: "⚠️Este campo é obrigatório." };
    if (valor.length < 8)
      return { valido: false, mensagem: "⚠️Mínimo 8 caracteres" };
    if (!/[A-Z]/.test(valor))
      return { valido: false, mensagem: "⚠️Letra maiúscula obrigatória" };
    if (!/[0-9]/.test(valor))
      return { valido: false, mensagem: "⚠️Número obrigatório" };
    if (!/[!@#$%^&*]/.test(valor))
      return { valido: false, mensagem: "⚠️Caractere especial obrigatório" };
    return { valido: true, mensagem: "" };
  }

  function validarConfirmarSenha(input) {
    const $input = $(input);
    const senha = $input.closest("form").find("input[name='senha']").val();

    if (!$input.val()) {
      mostrarErro($input, "⚠️Confirmação obrigatória");
      return false;
    }

    if ($input.val() !== senha) {
      mostrarErro($input, "⚠️Senhas não coincidem");
      return false;
    }

    mostrarSucesso($input);
    return true;
  }

  function validarNome(valor) {
    if (!valor) return { valido: false, mensagem: "⚠️Campo obrigatório" };
    if (valor.length < 3)
      return { valido: false, mensagem: "⚠️Mínimo 3 caracteres" };
    return { valido: true, mensagem: "" };
  }

  function validarNomeUsuario(valor) {
    if (!valor) return { valido: false, mensagem: "⚠️Campo obrigatório" };
    if (!/^[A-Za-z0-9_]+$/.test(valor))
      return { valido: false, mensagem: "⚠️Apenas letras, números e _" };
    return { valido: true, mensagem: "" };
  }

  // PROFISSIONAL
  function validarCref(valor) {
    if (!valor) return { valido: false, mensagem: "⚠️CREF obrigatório" };
    if (!/^\d{4,6}-[A-Z]\/[A-Z]{2}$/.test(valor))
      return { valido: false, mensagem: "⚠️Formato inválido (123456-G/SP)" };
    return { valido: true, mensagem: "" };
  }

  function validarSelect(select) {
    const $select = $(select);
    if (!$select.val()) {
      mostrarErro($select, "⚠️Selecione uma área");
      return false;
    }
    mostrarSucesso($select);
    return true;
  }

  function validarTempoExperiencia(valor) {
    if (!valor) return { valido: false, mensagem: "⚠️Campo obrigatório" };
    if (isNaN(valor) || valor < 0)
      return { valido: false, mensagem: "⚠️Valor inválido" };
    return { valido: true, mensagem: "" };
  }

  function validarEspecialidades(valor) {
    if (!valor) return { valido: false, mensagem: "⚠️Campo obrigatório" };
    if (valor.length < 3)
      return { valido: false, mensagem: "⚠️Mínimo 3 caracteres" };
    return { valido: true, mensagem: "" };
  }

  // LOGIN

  function validarEmailLogin(valor) {
  if (!valor)
    return { valido: false, mensagem: "⚠️Este campo é obrigatório." };

  if (valor.length < 3)
    return { valido: false, mensagem: "⚠️Login inválido." };

  return { valido: true, mensagem: "" };
}

  function validarSenhaLogin(valor) {
    if (!valor)
      return { valido: false, mensagem: "⚠️Este campo é obrigatório." };
    return { valido: true, mensagem: "" };
  }

  // ============ FEEDBACK VISUAL ============
  function mostrarErro($input, mensagem) {
    $input.addClass("erro-input").removeClass("sucesso-input");
    let $msg = $input.next(".msg-erro");

    if (!$msg.length) {
      const $campoSenha = $input.closest(".campo-senha");
      if ($campoSenha.length) {
        $msg = $campoSenha.next(".msg-erro");
      }
    }

    if ($msg.length) $msg.text(mensagem).show();
    else $input.after(`<span class="msg-erro">${mensagem}</span>`);
  }

  function mostrarSucesso($input) {
    $input.removeClass("erro-input").addClass("sucesso-input");

    let $msg = $input.next(".msg-erro");

    if (!$msg.length) {
      const $campoSenha = $input.closest(".campo-senha");
      if ($campoSenha.length) {
        $msg = $campoSenha.next(".msg-erro");
      }
    }

    if ($msg.length) $msg.empty().hide();
  }

  function mostrarMensagemErro(msg) {
    const alerta = $(`
      <div class="alerta-erro">
        ${msg}
      </div>
    `);

    $("body").append(alerta);

    setTimeout(() => {
      alerta.fadeOut(300, function () {
        $(this).remove();
      });
    }, 4000);
  }

  // LIMPEZA
  $("form input, textarea").on("input", function () {
    const $input = $(this);
    if ($input.hasClass("erro-input")) {
      $input.removeClass("erro-input");
      $input.next(".msg-erro").empty();
    }
  });
});
