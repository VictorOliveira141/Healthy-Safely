/* =============== SCRIPT PARA CONSEGUIR VER A SENHA NOS FORMULARIOS ============ */
function toggleSenha(inputId) {
  const input = document.getElementById(inputId);
  const btnOlho = event.target.closest(".btn-olho");
  const icone = btnOlho.querySelector("i");

  if (input.type === "password") {
    input.type = "text";
    icone.classList.remove("bi-eye-slash-fill");
    icone.classList.add("bi-eye-fill");
  } else {
    input.type = "password";
    icone.classList.remove("bi-eye-fill");
    icone.classList.add("bi-eye-slash-fill");
  }
}
/* ===================== FIM DO SCRIPT PARA VER A SENHA ======================= */ ;
