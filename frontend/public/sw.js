// Cache version — update this value when deploying new assets.
// The browser only re-installs the SW when sw.js content changes,
// so changing this string is enough to bust the cache on deploy.
const CACHE_VERSION = "v1.0.4";
const CACHE_NAME = `kstransport-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// Files to cache
const urlsToCache = [
  "/",
  "/login",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/offline",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("Service Worker: Cache install failed:", error);
      }),
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete all caches that are not the current one
            if (!cacheName.startsWith(`kstransport-${CACHE_VERSION}`)) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  // Handle only GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Deklarer url én gang
  let url;
  try {
    url = new URL(event.request.url);
    // Ignorer ikke-http(s) schema (som chrome-extension)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return;
    }
  } catch (e) {
    return;
  }

  // Sjekk for force-refresh parameter
  const forceRefresh = url.searchParams.get("force-refresh") === "true";

  if (forceRefresh) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For API calls, prøv network først, fallback til cache
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("/data/") ||
    event.request.url.includes("/upload/")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Hvis network request lyktes, cache responsen kun hvis det ikke er en POST/PUT/DELETE
          if (response.status === 200 && event.request.method === "GET") {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Hvis network feiler, prøv cache kun for GET requests
          if (event.request.method === "GET") {
            return caches.match(event.request).then((response) => {
              if (response) {
                return response;
              }
              // Hvis ingen cache, returner offline melding
              return new Response(
                JSON.stringify({
                  feil: "Ingen tilkobling til server",
                  offline: true,
                }),
                {
                  status: 503,
                  statusText: "Service Unavailable",
                  headers: { "Content-Type": "application/json" },
                },
              );
            });
          } else {
            // For POST/PUT/DELETE, returner feil hvis offline
            return new Response(
              JSON.stringify({
                feil: "Ingen tilkobling til server - handling kan ikke utføres offline",
                offline: true,
              }),
              {
                status: 503,
                statusText: "Service Unavailable",
                headers: { "Content-Type": "application/json" },
              },
            );
          }
        }),
    );
    return;
  }

  // Legg til cache-busting parameter for statiske filer
  // Gjenbruk url variabelen som allerede er deklarert
  if (
    url.pathname.includes(".js") ||
    url.pathname.includes(".css") ||
    url.pathname.includes(".png") ||
    url.pathname.includes(".jpg") ||
    url.pathname.includes(".jpeg") ||
    url.pathname.includes(".gif") ||
    url.pathname.includes(".svg")
  ) {
    // For static files, add version for cache-busting
    url.searchParams.set("v", CACHE_VERSION);
    const cacheBustedRequest = new Request(url.toString(), event.request);

    event.respondWith(
      caches.match(cacheBustedRequest).then((response) => {
        if (response) {
          return response;
        }

        return fetch(cacheBustedRequest)
          .then((response) => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(cacheBustedRequest, responseToCache);
              });
            }
            return response;
          })
          .catch(() => {
            // Fallback til original request uten cache-busting
            return fetch(event.request);
          });
      }),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Hvis funnet i cache, returner det
      if (response) {
        return response;
      }

      // Hvis ikke i cache, hent fra network
      return fetch(event.request)
        .then((response) => {
          // Sjekk om responsen er gyldig
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone responsen for caching
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Hvis network feiler og det er en navigasjon, vis offline side
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return new Response("Offline", { status: 503 });
        });
    }),
  );
});

// Background sync for offline data
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-requests") {
    event.waitUntil(syncPendingRequests());
  }
});

// Sync pending requests from IndexedDB
async function syncPendingRequests() {
  try {
    // Send message to all clients to trigger sync
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_PENDING_REQUESTS",
      });
    });
  } catch (error) {
    console.error("Service Worker: Background sync failed:", error);
  }
}

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
