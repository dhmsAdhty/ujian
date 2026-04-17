export async function onRequest(context) {
  const { request, next, env } = context;
  const cf = request.cf;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  // 1. HONEYPOT: Blokir path yang biasa diprobe Bot/Attacker
  const blockedPaths = [
    '.env', '.git', 'wp-admin', 'wp-login', 'phpmyadmin', 
    'config.php', 'xmlrpc.php', 'composer.json', '.well-known',
    'cgi-bin', 'ads.txt'
  ];
  if (blockedPaths.some(path => url.pathname.toLowerCase().includes(path))) {
    return new Response('Akses Ditolak: Stop kepo.', { status: 403 });
  }

  // 2. CEK NEGARA (Hanya Izinkan Indonesia)
  const country = cf?.country;
  const ALLOWED_COUNTRY = 'ID';
  if (country && country !== ALLOWED_COUNTRY) {
    // Beri pengecualian untuk file statis seperti images/css
    if (!url.pathname.match(/\.(png|jpg|css|js|ico|svg|woff2|webp)$/)) {
      return new Response('Akses Ditolak: Aplikasi ini khusus di Indonesia.', { status: 403 });
    }
  }

  // 3. CEK SKOR ANCAMAN (Threat Score dari Cloudflare)
  if (cf?.threat_score > 10) {
    return new Response('Akses Ditolak: Skor ancaman IP anda terlalu tinggi.', { status: 403 });
  }

  // 4. DETEKSI BOT BERDASARKAN USER-AGENT
  const botPatterns = [
    'python-requests', 'Python-urllib', 'Go-http-client', 'node-fetch', 
    'Scrapy', 'curl', 'wget', 'HeadlessChrome', 'AhrefsBot', 'semrushbot',
    'DataForSeoBot', 'DotBot', 'PetalBot', 'Bytespider', 'Baiduspider'
  ];

  if (botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern.toLowerCase()))) {
    return new Response('Akses Ditolak: Bot tidak diizinkan masuk.', { status: 403 });
  }

  // 5. CEK HEADER BROWSER STANDAR
  const isHuman = request.headers.get('sec-fetch-mode') || request.headers.get('accept-language');
  if (!isHuman && !userAgent.includes('Mozilla')) {
    return new Response('Akses Ditolak: Browser tidak valid.', { status: 403 });
  }

  // 6. SECRET HANDSHAKE: Cek apakah request datang dari client yang sah (Opsional untuk API)
  if (url.pathname.includes('/rest/v1/') && request.headers.get('X-ATS-Source') !== 'ats-web-app') {
     return new Response('Akses Ditolak: Invalid Source.', { status: 403 });
  }

  return await next();
}
