export async function onRequest(context) {
  const { request, next, env } = context;
  const cf = request.cf;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = url.pathname.toLowerCase();

  // ─── 1. HONEYPOT PATH ───────────────────────────────────────────
  const blockedPaths = [
    '.env', '.git', 'wp-admin', 'wp-login', 'phpmyadmin',
    'config.php', 'xmlrpc.php', 'composer.json', 'cgi-bin',
    'ads.txt', '.well-known/acme', 'actuator', 'telescope'
  ];
  if (blockedPaths.some(p => pathname.includes(p))) {
    return new Response('Forbidden', { status: 403 });
  }

  // ─── 2. IZINKAN ASSET STATIS TANPA CEK (PERFORMA) ───────────────
  const isStaticAsset = /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|otf|map)$/.test(pathname);
  if (isStaticAsset) {
    return await next(); // Langsung lewat, Cloudflare cache handle ini
  }

  // ─── 3. GEO-BLOCKING (Setelah static asset dilewat) ─────────────
  const country = cf?.country;
  if (country && country !== 'ID') {
    return new Response(
      'Akses Ditolak.',
      { 
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }

  // ─── 4. THREAT SCORE (FIX: gunakan camelCase) ───────────────────
  const threatScore = cf?.threatScore ?? 0;
  if (threatScore > 10) {
    return new Response('Akses Ditolak.', { status: 403 });
  }

  // ─── 5. DETEKSI BOT VIA USER-AGENT ──────────────────────────────
  const botPatterns = [
    'python-requests', 'python-urllib', 'go-http-client', 'node-fetch',
    'scrapy', 'curl/', 'wget/', 'headlesschrome', 'phantomjs',
    'ahrefsbot', 'semrushbot', 'dataforseobot', 'dotbot', 'petalbot',
    'bytespider', 'baiduspider', 'mj12bot', 'blexbot', 'yandexbot',
    'sogou', 'exabot', 'facebot', 'ia_archiver'
  ];
  const uaLower = userAgent.toLowerCase();
  if (botPatterns.some(p => uaLower.includes(p))) {
    return new Response('Forbidden', { status: 403 });
  }

  // ─── 6. VALIDASI HEADER BROWSER MANUSIA ─────────────────────────
  const secFetchMode = request.headers.get('sec-fetch-mode');
  const acceptLang   = request.headers.get('accept-language');
  const accept       = request.headers.get('accept') || '';

  // Request ke halaman HTML tapi tidak ada tanda-tanda browser asli
  const isPageRequest = !pathname.includes('/rest/') && 
                        !pathname.includes('/api/');
  if (isPageRequest && !secFetchMode && !acceptLang) {
    return new Response('Forbidden', { status: 403 });
  }

  // ─── 7. SECRET HANDSHAKE UNTUK API ──────────────────────────────
  const isApiRequest = pathname.includes('/rest/v1/') || pathname.includes('/api/');
  if (isApiRequest) {
    const atsSource = request.headers.get('X-ATS-Source');
    if (atsSource !== 'ats-web-app') {
      return new Response('Akses Ditolak.', { status: 403 });
    }
  }

  // ─── 8. CLOUDFLARE BOT SCORE (Jika pakai Pro/Business) ──────────
  // Uncomment jika plan kamu mendukung Bot Management
  // const botScore = cf?.botManagement?.score ?? 100;
  // if (botScore < 30) {
  //   return new Response('Forbidden', { status: 403 });
  // }

  return await next();
}