// ===============================
// CONFIGURAÇÕES
// ===============================
const STATIC_CACHE = "hs-static-v2";
const PAGES_CACHE = "hs-pages-v1";
const ASSETS_CACHE = "hs-assets-v1";

const STATIC_FILES = [
  "/",
  "/offline.html",
  "/manifest.json",

  "/css/global.css",

  "/imagem/pwa/icon-192-maskable.png",
  "/imagem/pwa/icon-512-maskable.png",
];
// ===============================
// INSTALAÇÃO
// ===============================

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_FILES)),
  );
});

// ===============================
// ATIVAÇÃO
// ===============================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (
            key !== STATIC_CACHE &&
            key !== PAGES_CACHE &&
            key !== ASSETS_CACHE
          ) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );

  self.clients.claim();
});

// ===============================
// FETCH
// ===============================

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const request = event.request;
  const url = new URL(request.url);

  // Ignora requisições externas
  if (url.origin !== location.origin) return;

  // ===========================
  // HTML (Network First)
  // ===========================

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();

          caches.open(PAGES_CACHE).then((cache) => {
            cache.put(request, clone);
          });

          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);

          if (cached) return cached;

          return caches.match("/offline.html");
        }),
    );

    return;
  }

  // ===========================
  // CSS / JS / Imagens / Fontes
  // (Stale While Revalidate)
  // ===========================

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const clone = response.clone();

            caches.open(ASSETS_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }

          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});

// ===============================
// WEB PUSH — recebimento
// ===============================

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (e) {
    dados = { title: "Healthy Safely", horario: "" };
  }

  const titulo = dados.title || "Lembrete de tarefa";
  const opcoes = {
    body: dados.horario
      ? `Está na hora da sua tarefa · ${dados.horario}`
      : "Sua tarefa está no horário.",
    icon: "/imagem/pwa/icon-192.png",
    badge: "/imagem/pwa/icon-192.png",
    tag: dados.tag || `tarefa-${dados.tarefaId || "geral"}`,
    renotify: false,
    data: { tarefaId: dados.tarefaId || null },
    actions: [
      { action: "start", title: "Começar" },
      { action: "later", title: "Agora não" },
    ],
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

// ===============================
// WEB PUSH — clique na notificação
// ===============================

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action !== "start") return;

  const tarefaId = event.notification.data?.tarefaId;
  if (!tarefaId) return;

  event.waitUntil(
    fetch(
      new URL(
        `/tasks/concluir/${encodeURIComponent(tarefaId)}`,
        self.registration.scope,
      ),
      { method: "POST", credentials: "same-origin", cache: "no-store" },
    )
      .then((resposta) => {
        if (!resposta.ok || resposta.redirected) {
          throw new Error(`Falha ao concluir tarefa: ${resposta.status}`);
        }
      })
      .catch((erro) => {
        console.error("Não foi possível concluir pela notificação:", erro);
      }),
  );
});