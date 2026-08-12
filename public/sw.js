self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = typeof data.title === "string" ? data.title : "Ask Magic Mike lead alert";
  const options = {
    body: typeof data.body === "string" ? data.body : "Open the secure Lead Center.",
    icon: typeof data.icon === "string" ? data.icon : "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.png",
    badge: typeof data.badge === "string" ? data.badge : "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-128.png",
    tag: typeof data.tag === "string" ? data.tag : "ask-magic-mike-lead",
    renotify: true,
    data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/admin/leads" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin/leads", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    return existing ? existing.navigate(target).then(() => existing.focus()) : clients.openWindow(target);
  }));
});
