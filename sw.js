// ChompMeds service worker
const CACHE_NAME = "chompmeds-v2";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isNavigation =
    event.request.mode === "navigate" || event.request.destination === "document";

  if (isNavigation) {
    // Network-first for the app shell itself, so a new deploy is picked up
    // on the very next load instead of being masked by an old cached copy.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest) is fine, they rarely change.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// --- Push notifications ---
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "ChompMeds", body: event.data ? event.data.text() : "Time for a dose!" };
  }

  const title = data.title || "🟡 CHOMP TIME!";
  const options = {
    body: data.body || "Something is waiting to be taken.",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    vibrate: [120, 60, 120, 60, 240],
    tag: data.medicineId ? "chompmeds-" + data.medicineId : "chompmeds",
    renotify: true,
    requireInteraction: true,
    data: {
      medicineId: data.medicineId || null,
      url: "/"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
