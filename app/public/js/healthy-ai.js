function initHealthyAi() {
  const healthyAiTriggers = document.querySelectorAll(".healthy-ai-trigger");
  const healthyAiSidebar = document.getElementById("healthyAiSidebar");
  const healthyAiClose = document.getElementById("healthyAiClose");
  const healthyAiForm = document.getElementById("healthyAiForm");
  const healthyAiInput = document.getElementById("healthyAiInput");
  const healthyAiBody = document.getElementById("healthyAiBody");

  if (
    healthyAiTriggers.length === 0 ||
    !healthyAiSidebar ||
    !healthyAiClose ||
    !healthyAiForm ||
    !healthyAiInput ||
    !healthyAiBody
  ) {
    return;
  }

  function toggleSidebar() {
    const isOpen = healthyAiSidebar.classList.toggle("open");
    healthyAiSidebar.setAttribute("aria-hidden", String(!isOpen));

    if (isOpen) {
      healthyAiInput.focus();
      requestAnimationFrame(() => {
        healthyAiBody.scrollTop = healthyAiBody.scrollHeight;
      });
    }
  }

  window.toggleHealthyAi = toggleSidebar;

  healthyAiTriggers.forEach((button) => {
    button.addEventListener("click", toggleSidebar);
  });

  function addMessage(content, type) {
    const wrapper = document.createElement("div");
    wrapper.className = `healthy-ai-message ${type}`;

    const meta = document.createElement("div");
    meta.className = "healthy-ai-meta";
    meta.textContent = type === "user" ? "Você" : "Healthy AI";

    const text = document.createElement("p");
    text.textContent = content;

    wrapper.append(meta, text);
    healthyAiBody.appendChild(wrapper);

    healthyAiBody.scrollTop = healthyAiBody.scrollHeight;
  }

  async function renderReply(userMessage) {
    try {
      const res = await fetch("/ia/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mensagem: userMessage,
        }),
      });

      const data = await res.json();

      if (data.erro) {
        addMessage(data.erro || "Erro ao conectar com a IA.", "bot");
        return;
      }

      addMessage(data.resposta, "bot");
    } catch (err) {
      console.error(err);
      addMessage("Erro ao se comunicar com o servidor.", "bot");
    }
  }

  healthyAiClose.addEventListener("click", toggleSidebar);

  healthyAiForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = healthyAiInput.value.trim();
    if (!text) return;

    addMessage(text, "user");

    healthyAiInput.value = "";
    healthyAiInput.focus();

    renderReply(text);
  });

  healthyAiInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      healthyAiForm.requestSubmit();
    }
  });
}

document.addEventListener("DOMContentLoaded", initHealthyAi);
