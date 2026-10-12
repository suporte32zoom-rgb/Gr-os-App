/**
 * =========================================================================
 * HARVESTA PWA - SERVICE WORKER OFFLINE-FIRST
 * Versão do Cache: harvesta-v1.0.0
 * Desenvolvido para produtores rurais familiares (funciona 100% sem sinal na lavoura)
 * =========================================================================
 */

const CACHE_NAME = 'harvesta-v1.0.0';
const DYNAMIC_CACHE_NAME = 'harvesta-data-v1.0.0';

// Arquivos fundamentais pré-cacheados na instalação
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'
];

// Instalação do Service Worker e pre-caching dos assets essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Harvesta SW] Pré-armazenando arquivos para uso offline...');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Harvesta SW] Alguns assets não puderam ser pré-cacheados imediatamente:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Ativação do Service Worker e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE_NAME) {
            console.log('[Harvesta SW] Removendo cache obsoleto:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições de rede
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Requisições para APIs externas (Open-Meteo, Cotações): Estratégia Network-First com fallback para Cache
  if (url.hostname.includes('open-meteo.com') || url.hostname.includes('awesomeapi.com.br')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Se estiver sem sinal na roça, busca os últimos dados salvos no cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log('[Harvesta SW] Usando dados climáticos/cotações em cache (offline):', request.url);
            return cachedResponse;
          }
          // Retorna resposta vazia estruturada em JSON caso não haja cache
          return new Response(JSON.stringify({ offline: true, error: 'Sem conexão e sem dados em cache' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Estratégia Stale-While-Revalidate para navegação e assets estáticos
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Em caso de falha de rede total, retorna o cache ou página raiz para navegações HTML
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return null;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
