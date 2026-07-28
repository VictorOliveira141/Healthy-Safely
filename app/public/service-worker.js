const CACHE_NAME = "healthy-safely-v2";

const urlsToCache = [
  "/",
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

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.url.startsWith(self.location.origin)
          ) {
            const responseClone = networkResponse.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }

          return networkResponse;
        })
        .catch(async () => {
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }

          return cachedResponse;
        });

      return cachedResponse || networkFetch;
    }),
  );
});
