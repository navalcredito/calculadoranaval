// Service worker da Calculadora FIDC NX Boats.
// Guarda o app inteiro no aparelho para funcionar sem internet, inclusive
// depois de recarregar a página. Troque a VERSAO a cada publicação.
const VERSAO = 'fidc-nx-v2.4.2';

const ARQUIVOS = [
  './',
  './index.html',
  './naval.html',
  './manifest.webmanifest',
  './manifest-naval.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.svg',
  './favicon-16.png',
  './favicon-32.png',
  './favicon-48.png'
];

// Instalação: baixa tudo de uma vez. addAll falha em bloco se um arquivo faltar,
// então gravamos um a um para um 404 isolado não derrubar o cache inteiro.
self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(VERSAO);
    await Promise.all(ARQUIVOS.map(async (url) => {
      try {
        const resposta = await fetch(url, { cache: 'reload' });
        if (resposta.ok) await cache.put(url, resposta);
      } catch (e) { /* segue sem esse arquivo */ }
    }));
    self.skipWaiting();
  })());
});

// Ativação: apaga versões antigas e assume o controle das abas abertas.
self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Busca: responde na hora pelo cache e, em paralelo, tenta atualizar.
// Sem rede, continua servindo o que está guardado.
self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  evento.respondWith((async () => {
    const cache = await caches.open(VERSAO);
    const guardado = await cache.match(req, { ignoreSearch: true });

    const rede = fetch(req).then((resposta) => {
      if (resposta && resposta.ok) cache.put(req, resposta.clone());
      return resposta;
    }).catch(() => null);

    if (guardado) return guardado;

    const resposta = await rede;
    if (resposta) return resposta;

    // Offline e sem cópia: se for navegação, devolve a página principal.
    if (req.mode === 'navigate') {
      return (await cache.match('./index.html')) || Response.error();
    }
    return Response.error();
  })());
});
