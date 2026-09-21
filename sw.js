const CACHE = "memorias-a-mesa-v5";
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./ocr.js",
  "./assistant.js",
  "./ai-adapter.js",
  "./db.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

  // Fontes: serve do cache e atualiza em segundo plano quando houver rede.
  if (isFont) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          const fresh = fetch(req).then((res) => {
            if (res.ok || res.type === "opaque") cache.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || fresh;
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navegação: tenta a rede para pegar atualizações, cai para o app salvo quando offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then((hit) => hit || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
      }
      return res;
    }))
  );
});
