const CACHE_NAME = "healthy-safely-v2";

const urlsToCache = [
  "/offline.html",
  "/css/global.css",
  "/manifest.json",
  "/imagem/pwa/icon-192.png",
  "/imagem/pwa/icon-512.png",
];

// Instala o Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache criado.");
      return cache.addAll(urlsToCache);
    }),
  );

  self.skipWaiting();
});

// Ativa o Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      ),
    ),
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Não cacheia páginas HTML
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  // Cache apenas de arquivos estáticos
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    }),
  );
});
