/* js para o cadastro de usuário em múltiplos passos */

$(document).ready(function () {
  const $form = $(".form-multistep");
  const $steps = $(".step-panel");
  const $stepLabels = $(".step-label");
  const $progressFill = $(".step-indicator__fill");
  const $counter = $("#step-counter");
  const $feedback = $(".form-feedback");
  const $loading = $(".form-loading");
  const $submitButton = $form.find('button[type="submit"]');
  const $step1Button = $form.find(
    '.step-panel[data-step="1"] [data-action="next"]',
  );
  const $step2Button = $form.find(
    '.step-panel[data-step="2"] [data-action="next"]',
  );
  const validation = window.HealthySafelyValidation || {};
  let currentStep = 1;

  function updateProgress(step) {
    currentStep = step;
    $steps.removeClass("active");
    $steps.filter('[data-step="' + step + '"]').addClass("active");

    $stepLabels.removeClass("active completed");
    $stepLabels.each(function () {
      const value = Number($(this).data("step"));
      if (value < step) $(this).addClass("completed");
      else if (value === step) $(this).addClass("active");
    });

    const width = (step / 3) * 100;
    $progressFill.css("width", width + "%");
    $counter.text("Passo " + step + " de 3");
  }

  function showFeedback(message, type) {
    $feedback.removeClass("msg-sucesso");
    if (type === "success") {
      $feedback.addClass("msg-sucesso").text(message);
    } else {
      $feedback.text(message);
    }
  }

  function validateStep(step) {
    if (step === 1) {
      if (!validation.getStep1Valid()) {
        showFeedback("Digite um e-mail válido.", "error");
        return false;
      }
      showFeedback("", "");
      return true;
    }

    if (step === 2) {
      if (!validation.getStep2Valid()) {
        showFeedback(
          "A senha precisa ser forte e igual na confirmação.",
          "error",
        );
        return false;
      }
      showFeedback("", "");
      return true;
    }

    if (step === 3) {
      if (!validation.getStep3Valid()) {
        showFeedback(
          "Complete os campos do usuário antes de criar a conta.",
          "error",
        );
        return false;
      }
      showFeedback("", "");
      return true;
    }

    return true;
  }

  function updateButtons() {
    $step1Button.prop(
      "disabled",
      !(validation.getStep1Valid ? validation.getStep1Valid() : false),
    );
    $step2Button.prop(
      "disabled",
      !(validation.getStep2Valid ? validation.getStep2Valid() : false),
    );
    $submitButton.prop(
      "disabled",
      !(validation.getStep3Valid ? validation.getStep3Valid() : false),
    );
  }

  $form.find('[data-action="next"]').on("click", function (e) {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    if (currentStep === 1) {
      validation
        .checkEmailAvailability($("#email").val().trim())
        .then(function (disponivel) {
          if (!disponivel) return;
          updateProgress(2);
          showFeedback("", "");
        });
      return;
    }

    if (currentStep === 2) {
      updateProgress(3);
      showFeedback("", "");
      return;
    }

    if (currentStep === 3) {
      $loading.addClass("active");
      $submitButton.prop("disabled", true);
      $form.trigger("submit");
      return;
    }
  });

  $form.find('[data-action="back"]').on("click", function (e) {
    e.preventDefault();
    if (currentStep > 1) {
      updateProgress(currentStep - 1);
      showFeedback("", "");
    }
  });

  $form.on("submit", function (e) {
    if (currentStep !== 3) {
      e.preventDefault();
      return;
    }

    if (!validateStep(3)) {
      e.preventDefault();
      $loading.removeClass("active");
      $submitButton.prop("disabled", false);
      return;
    }

    e.preventDefault();
    validation
      .checkUsernameAvailability($("#nomeusuario").val().trim())
      .then(function (disponivel) {
        if (!disponivel) {
          $loading.removeClass("active");
          $submitButton.prop("disabled", false);
          return;
        }

        const data = $form.serialize();
        $.ajax({
          url: "/cadastroCliente",
          type: "POST",
          data: data,
          headers: { "X-Requested-With": "XMLHttpRequest" },
          success: function (response) {
            if (response.sucesso) {
              showFeedback(
                "Conta criada com sucesso! Redirecionando...",
                "success",
              );
              window.location.href = response.redirect || "/dashboard";
            } else {
              $loading.removeClass("active");
              $submitButton.prop("disabled", false);
              if (response.msgErro && response.msgErro.email) {
                showFeedback(response.msgErro.email, "error");
              } else if (response.msgErro && response.msgErro.nomeusuario) {
                showFeedback(response.msgErro.nomeusuario, "error");
              } else if (response.msgErro && response.msgErro.geral) {
                showFeedback(response.msgErro.geral, "error");
              }
            }
          },
          error: function () {
            $loading.removeClass("active");
            $submitButton.prop("disabled", false);
            showFeedback(
              "Não foi possível criar sua conta. Tente novamente.",
              "error",
            );
          },
        });
      });
  });

  $(document).on("cadastro-validation:update", updateButtons);
  updateButtons();
  updateProgress(1);
});
