export async function onRequest(context) {
  const { request, next } = context;
  const cf = request.cf;
  const userAgent = request.headers.get('user-agent') || '';

  // 1. CEK NEGARA (Hanya Izinkan Indonesia)
  const country = cf?.country;
  const ALLOWED_COUNTRY = 'ID';

  if (country && country !== ALLOWED_COUNTRY) {
    return new Response('Akses Ditolak: Goblok.', { status: 403 });
  }

  // 2. CEK SKOR ANCAMAN (Threat Score)
  if (cf?.threat_score > 10) {
    return new Response('Akses Ditolak: Coba lagi', { status: 403 });
  }

  // 3. DETEKSI BOT BERDASARKAN USER-AGENT
  const botPatterns = [
    'python-requests', 'Python-urllib', 'Go-http-client', 'node-fetch', 
    'Scrapy', 'curl', 'wget', 'HeadlessChrome', 'AhrefsBot', 'semrushbot'
  ];

  if (botPatterns.some(pattern => userAgent.includes(pattern))) {
    return new Response('Akses Ditolak: Sorry tak tolak.', { status: 403 });
  }

  // 4. CEK HEADER BROWSER
  if (!request.headers.get('accept-language') && !userAgent.includes('Mozilla')) {
    return new Response('Akses Ditolak: Browsermu illegal blok.', { status: 403 });
  }

  return await next();
}
