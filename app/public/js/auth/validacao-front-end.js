/* js para validação front-end na página de cadastro e login */

(function ($) {
  const validation = {
    state: {
      emailValid: false,
      emailAvailable: null,
      passwordValid: false,
      confirmPasswordValid: false,
      nameValid: false,
      usernameValid: false,
      usernameAvailable: null,
    },
    debounceTimer: null,

    initClientForm: function ($form) {
      if (!$form || !$form.length) return;

      const $email = $form.find("#email");
      const $senha = $form.find("#senha");
      const $confirmar = $form.find("#confirmarSenha");
      const $nome = $form.find("#nome");
      const $nomeusuario = $form.find("#nomeusuario");

      $email.on("input", () => {
        const value = $email.val().trim();
        const result = this.validateEmail(value);
        this.state.emailValid = result.valid;
        this.state.emailAvailable = null;
        this.setFieldState($email, result.valid, result.message);
        if (result.valid) {
          this.checkEmailAvailability(value);
        } else {
          this.triggerUpdate();
        }
      });

      $email.on("blur", () => {
        const value = $email.val().trim();
        if (value) {
          this.checkEmailAvailability(value);
        }
      });

      $senha.on("input", () => {
        const value = $senha.val();
        const result = this.validatePassword(value);
        this.state.passwordValid = result.valid;
        this.setFieldState($senha, result.valid, result.message);

        if ($confirmar.val()) {
          const confirm = this.validateConfirmPassword(value, $confirmar.val());
          this.state.confirmPasswordValid = confirm.valid;
          this.setFieldState($confirmar, confirm.valid, confirm.message);
        } else {
          this.state.confirmPasswordValid = false;
        }

        this.triggerUpdate();
      });

      $confirmar.on("input", () => {
        const result = this.validateConfirmPassword(
          $senha.val(),
          $confirmar.val(),
        );
        this.state.confirmPasswordValid = result.valid;
        this.setFieldState($confirmar, result.valid, result.message);
        this.triggerUpdate();
      });

      $nome.on("input", () => {
        const result = this.validateName($nome.val().trim());
        this.state.nameValid = result.valid;
        this.setFieldState($nome, result.valid, result.message);
        this.triggerUpdate();
      });

      $nomeusuario.on("input", () => {
        const value = $nomeusuario.val().trim();
        const result = this.validateUsername(value);
        this.state.usernameValid = result.valid;
        this.setFieldState($nomeusuario, result.valid, result.message);

        if (result.valid) {
          this.scheduleUsernameCheck(value);
        } else {
          this.state.usernameAvailable = null;
          this.triggerUpdate();
        }
      });

      $nomeusuario.on("blur", () => {
        const value = $nomeusuario.val().trim();
        if (value && this.state.usernameValid) {
          this.checkUsernameAvailability(value);
        }
      });

      this.syncInitialValues($form);
    },

    syncInitialValues: function ($form) {
      const $email = $form.find("#email");
      const $senha = $form.find("#senha");
      const $confirmar = $form.find("#confirmarSenha");
      const $nome = $form.find("#nome");
      const $nomeusuario = $form.find("#nomeusuario");

      if ($email.val()) {
        const result = this.validateEmail($email.val().trim());
        this.state.emailValid = result.valid;
        this.setFieldState($email, result.valid, result.message);
        if (result.valid) this.checkEmailAvailability($email.val().trim());
      }

      if ($senha.val()) {
        const result = this.validatePassword($senha.val());
        this.state.passwordValid = result.valid;
        this.setFieldState($senha, result.valid, result.message);
      }

      if ($confirmar.val() && $senha.val()) {
        const result = this.validateConfirmPassword(
          $senha.val(),
          $confirmar.val(),
        );
        this.state.confirmPasswordValid = result.valid;
        this.setFieldState($confirmar, result.valid, result.message);
      }

      if ($nome.val()) {
        const result = this.validateName($nome.val().trim());
        this.state.nameValid = result.valid;
        this.setFieldState($nome, result.valid, result.message);
      }

      if ($nomeusuario.val()) {
        const result = this.validateUsername($nomeusuario.val().trim());
        this.state.usernameValid = result.valid;
        this.setFieldState($nomeusuario, result.valid, result.message);
        if (result.valid)
          this.checkUsernameAvailability($nomeusuario.val().trim());
      }

      this.triggerUpdate();
    },

    triggerUpdate: function () {
      $(document).trigger("cadastro-validation:update");
    },

    setFieldState: function ($input, isValid, message) {
      $input.removeClass("erro-input");
      if (message) {
        $input.addClass(isValid ? "" : "erro-input");
        let $msg = $input.next(".msg-erro");
        if (!$msg.length) {
          const $wrapper = $input.closest(".campo-senha");
          if ($wrapper.length) {
            $msg = $wrapper.next(".msg-erro");
          }
        }
        if ($msg.length) {
          $msg.text(message).show();
        }
      } else {
        let $msg = $input.next(".msg-erro");
        if (!$msg.length) {
          const $wrapper = $input.closest(".campo-senha");
          if ($wrapper.length) {
            $msg = $wrapper.next(".msg-erro");
          }
        }
        if ($msg.length) {
          $msg.empty().hide();
        }
      }
    },

    validateEmail: function (value) {
      if (!value) return { valid: false, message: "Informe seu e-mail." };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { valid: false, message: "E-mail inválido." };
      }
      return { valid: true, message: "" };
    },

    validatePassword: function (value) {
      if (!value) return { valid: false, message: "Informe uma senha." };
      if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value)) {
        return {
          valid: false,
          message: "Use 8+ caracteres, letra maiúscula, número e símbolo.",
        };
      }
      return { valid: true, message: "" };
    },

    validateConfirmPassword: function (password, confirmValue) {
      if (!confirmValue)
        return { valid: false, message: "Confirme sua senha." };
      if (password !== confirmValue) {
        return { valid: false, message: "As senhas não coincidem." };
      }
      return { valid: true, message: "" };
    },

    validateName: function (value) {
      if (!value)
        return { valid: false, message: "Informe seu nome completo." };
      if (
        value.length < 3 ||
        value.length > 50 ||
        !/^[A-Za-zÀ-ú\s]+$/.test(value)
      ) {
        return { valid: false, message: "Nome inválido." };
      }
      return { valid: true, message: "" };
    },

    validateUsername: function (value) {
      if (!value)
        return { valid: false, message: "Escolha um nome de usuário." };
      if (
        !/^[a-zA-Z0-9_-]+$/.test(value) ||
        value.length < 3 ||
        value.length > 30
      ) {
        return {
          valid: false,
          message: "Use apenas letras, números, hífen e underscore.",
        };
      }
      return { valid: true, message: "" };
    },

    checkEmailAvailability: function (value) {
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        this.state.emailAvailable = null;
        this.triggerUpdate();
        return $.Deferred().resolve(true).promise();
      }

      return $.ajax({
        url: "/api/cadastro/disponibilidade",
        data: { email: value },
        dataType: "json",
      })
        .then((response) => {
          if (response.email && !response.email.disponivel) {
            this.state.emailAvailable = false;
            this.setFieldState(
              $("#email"),
              false,
              "Este e-mail já está cadastrado.",
            );
            return false;
          }
          this.state.emailAvailable = true;
          this.setFieldState($("#email"), true, "");
          return true;
        })
        .always(() => this.triggerUpdate());
    },

    scheduleUsernameCheck: function (value) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.checkUsernameAvailability(value);
      }, 300);
    },

    checkUsernameAvailability: function (value) {
      if (!value || !/^[a-zA-Z0-9_-]+$/.test(value) || value.length < 3) {
        this.state.usernameAvailable = null;
        this.triggerUpdate();
        return $.Deferred().resolve(true).promise();
      }

      return $.ajax({
        url: "/api/cadastro/disponibilidade",
        data: { nomeusuario: value },
        dataType: "json",
      })
        .then((response) => {
          if (response.nomeusuario && !response.nomeusuario.disponivel) {
            this.state.usernameAvailable = false;
            this.setFieldState(
              $("#nomeusuario"),
              false,
              "Nome de usuário indisponível.",
            );
            return false;
          }
          this.state.usernameAvailable = true;
          this.setFieldState($("#nomeusuario"), true, "");
          return true;
        })
        .always(() => this.triggerUpdate());
    },

    getStep1Valid: function () {
      return this.state.emailValid && this.state.emailAvailable !== false;
    },

    getStep2Valid: function () {
      return this.state.passwordValid && this.state.confirmPasswordValid;
    },

    getStep3Valid: function () {
      return (
        this.state.nameValid &&
        this.state.usernameValid &&
        this.state.usernameAvailable !== false
      );
    },
  };

  $(function () {
    const $form = $(".form-multistep");
    if ($form.length) {
      validation.initClientForm($form);
    }
  });

  window.HealthySafelyValidation = validation;
})(jQuery);
