/* Service worker: שומר את קובצי האפליקציה במכשיר כדי שתעבוד גם בלי אינטרנט.
   בכל עדכון של האתר שנו את מספר הגרסה כאן, כדי שהמכשירים יורידו את הקבצים החדשים. */
const VERSION = 'maaser-v1.1.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    fetch(request).then((response) => {
      clearTimeout(timer);
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(request, copy));
      }
      resolve(response);
    }, (err) => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    /* הדף עצמו: קודם מהרשת (כדי לקבל עדכונים), ואם אין רשת מהעותק השמור */
    event.respondWith(
      fromNetwork(request, 3500).catch(() =>
        caches.match(request, { ignoreSearch: true })
          .then((hit) => hit || caches.match('./index.html'))
          .then((hit) => hit || caches.match('./'))
      )
    );
    return;
  }
  /* שאר הקבצים: מהעותק השמור, ואם חסר מהרשת */
  event.respondWith(
    caches.match(request).then((hit) => hit || fromNetwork(request, 8000))
  );
});
