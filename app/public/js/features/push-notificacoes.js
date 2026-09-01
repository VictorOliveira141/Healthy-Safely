(function () {
  const toggle = document.getElementById("toggleLembrete");

  if (!toggle) return;

  function base64UrlToUint8Array(base64UrlData) {
    const padding = "=".repeat((4 - (base64UrlData.length % 4)) % 4);
    const base64 = (base64UrlData + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
  }

  async function obterRegistroServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Este navegador não suporta Service Worker.");
    }

    console.log("[Push] Registrando Service Worker...");
    await navigator.serviceWorker.register("/service-worker.js");
    console.log("[Push] Service Worker registrado");

    return navigator.serviceWorker.ready;
  }

  async function enviarSubscription(subscription) {
    console.log("[Push] Enviando subscription para o backend...");
    const resposta = await fetch("/api/push/inscrever", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    const resultado = await resposta.json().catch(() => ({}));
    if (!resposta.ok || !resultado.ok) {
      throw new Error(
        resultado.erro || `Backend respondeu HTTP ${resposta.status}.`,
      );
    }

    console.log("[Push] Subscription salva com sucesso");
  }

  async function ativarPush() {
    if (!("Notification" in window)) {
      throw new Error("Este navegador não suporta notificações.");
    }

    if (!("PushManager" in window)) {
      throw new Error("Este navegador não suporta a API Push.");
    }

    if (!window.isSecureContext) {
      throw new Error("Push exige HTTPS ou localhost.");
    }

    if (!window.VAPID_PUBLIC_KEY) {
      throw new Error("VAPID_PUBLIC_KEY não foi disponibilizada pelo servidor.");
    }

    console.log("[Push] Solicitando permissão...");
    const permissao = await Notification.requestPermission();
    console.log(`[Push] Permissão: ${permissao}`);
    if (permissao !== "granted") {
      throw new Error(`Permissão de notificações não concedida: ${permissao}.`);
    }

    const registro = await obterRegistroServiceWorker();
    console.log("[Push] Criando subscription...");
    let subscription = await registro.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(window.VAPID_PUBLIC_KEY),
      });
    }

    console.log("[Push] Subscription criada");
    await enviarSubscription(subscription);
  }

  async function desativarPush() {
    const registro = await navigator.serviceWorker.ready;
    const subscription = await registro.pushManager.getSubscription();
    if (!subscription) return;

    const resposta = await fetch("/api/push/desinscrever", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    if (!resposta.ok) {
      throw new Error(`Não foi possível desativar o Push (HTTP ${resposta.status}).`);
    }

    await subscription.unsubscribe();
  }

  async function atualizarEstadoInicial() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const registro = await navigator.serviceWorker.ready;
      toggle.checked = Boolean(await registro.pushManager.getSubscription());
    } catch (erro) {
      console.error("[Push] Não foi possível ler a subscription atual:", erro);
    }
  }

  toggle.addEventListener("change", async () => {
    const ativando = toggle.checked;
    toggle.disabled = true;

    try {
      if (ativando) {
        await ativarPush();
      } else {
        await desativarPush();
      }
    } catch (erro) {
      toggle.checked = !ativando;
      console.error("[Push] Falha ao atualizar notificações:", erro);
    } finally {
      toggle.disabled = false;
    }
  });

  atualizarEstadoInicial();
})();