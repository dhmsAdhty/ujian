const renderErrorPage = (title, message, reason) => {
  return `
  <!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | CBT ATS</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Outfit', sans-serif; background: #050505; color: white; overflow: hidden; }
      .bg-blur {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(circle at 20% 30%, #1e1b4b 0%, transparent 40%),
                    radial-gradient(circle at 80% 70%, #312e81 0%, transparent 40%);
        z-index: -1; animation: mesh 10s ease-in-out infinite alternate;
      }
      @keyframes mesh { 0% { transform: scale(1); } 100% { transform: scale(1.1) rotate(5deg); } }
      .glass {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .shield-pulse { animation: pulse 2s infinite; }
      @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } }
      .glow-text { text-shadow: 0 0 20px rgba(99, 102, 241, 0.5); }
    </style>
  </head>
  <body class="flex items-center justify-center min-h-screen p-4">
    <div class="bg-blur"></div>
    <div id="app" class="max-w-md w-full glass rounded-3xl p-8 text-center relative overflow-hidden">
      <!-- Decor -->
      <div class="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
      
      <div class="relative z-10">
        <div class="mb-6 flex justify-center">
          <div class="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 shield-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        </div>
        
        <h1 class="text-5xl font-extrabold mb-2 glow-text">403</h1>
        <h2 class="text-2xl font-bold mb-4 text-indigo-300">{{ title }}</h2>
        <p class="text-gray-400 mb-8 leading-relaxed">{{ message }}</p>
        
        <div class="bg-black/20 rounded-xl p-4 mb-8 text-sm border border-white/5">
          <span class="text-gray-500">Reason:</span>
          <span class="text-indigo-400 font-mono ml-2 font-bold">{{ reason }}</span>
        </div>
        
        <button @click="goHome" class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 transition-all rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95">
          Kembali ke Dashboard
        </button>
        
        <p class="mt-6 text-xs text-gray-600 tracking-widest uppercase">ATS SECURITY ENGINE v2.0</p>
      </div>
    </div>

    <script>
      const { createApp } = Vue
      createApp({
        data() {
          return {
            title: '${title}',
            message: '${message}',
            reason: '${reason}'
          }
        },
        methods: {
          goHome() { window.location.href = '/'; }
        }
      }).mount('#app')
    </script>
  </body>
  </html>
  `;
};

export async function onRequest(context) {
  const { request, next, env } = context;
  const cf = request.cf;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = url.pathname.toLowerCase();

  // ─── 0. BLOCK EKSTENSI SENSITIF (INSTANT DROP) ───────────────────
  // Menangani lonjakan probing .txt dan file konfigurasi secara efisien
  const forbiddenExts = /\.(txt|php|env|sql|yaml|yml|log|bak|config|swp|sh|bat|ini|bak|zip|rar)$/i;
  if (forbiddenExts.test(pathname)) {
    return new Response(
      renderErrorPage('Akses Ditolak', 'Maaf, permintaan Anda diblokir karena mencoba mengakses file sensitif.', 'FORBIDDEN_EXTENSION'),
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // ─── 1. HONEYPOT PATH (JEBAKAN BOT) ──────────────────────────────
  const blockedPaths = [
    '.env', '.git', 'wp-admin', 'wp-login', 'phpmyadmin',
    'config.php', 'xmlrpc.php', 'composer.json', 'cgi-bin',
    'ads.txt', '.well-known/acme', 'actuator', 'telescope',
    'debug', 'monitor', 'setup', 'install'
  ];
  if (blockedPaths.some(p => pathname.includes(p))) {
    return new Response(
      renderErrorPage('Akses Ditolak', 'Aktivitas mencurigakan terdeteksi. Silakan gunakan browser resmi.', 'HONEYPOT_TRAP'),
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    );
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
      renderErrorPage('Wilayah Terbatas', 'Sistem CBT ini hanya dapat diakses dari wilayah Indonesia.', 'GEO_LOCATION_RESTRICTED'),
      { 
        status: 403, 
        headers: { 'Content-Type': 'text/html' } 
      }
    );
  }

  // ─── 4. THREAT SCORE (FIX: gunakan camelCase) ───────────────────
  const threatScore = cf?.threatScore ?? 0;
  if (threatScore > 10) {
    return new Response(
      renderErrorPage('Skor Ancaman Tinggi', 'Keamanan Cloudflare menandai koneksi Anda berisiko. Coba matikan VPN.', 'HIGH_THREAT_SCORE'),
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    );
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
    return new Response(
      renderErrorPage('Terdeteksi Bot', 'Sistem kami mendeteksi penggunaan script otomatis. Silakan gunakan browser.', 'BOT_USER_AGENT'),
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // ─── 6. VALIDASI HEADER BROWSER MANUSIA ─────────────────────────
  const secFetchMode = request.headers.get('sec-fetch-mode');
  const secFetchDest = request.headers.get('sec-fetch-dest');
  const acceptLang   = request.headers.get('accept-language');
  
  // Deteksi Anomali: Browser modern selalu mengirimkan sec-fetch-mode
  // Jika ini request halaman (bukan API/Asset) tapi tidak ada header ini, kemungkinan bot/curl
  const isPageRequest = !pathname.includes('/rest/') && 
                        !pathname.includes('/api/') &&
                        pathname !== '/';

  if (isPageRequest && !secFetchMode && !acceptLang) {
    return new Response(
      renderErrorPage('Anomali Browser', 'Koneksi Anda tidak terlihat seperti browser normal.', 'BROWSER_INTEGRITY_FAIL'),
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // ─── 7. VERIFIKASI INTEGRITAS API & REFERER ──────────────────────
  const isApiRequest = pathname.includes('/rest/v1/') || pathname.includes('/api/');
  if (isApiRequest) {
    const atsSource = request.headers.get('X-ATS-Source');
    const referer   = request.headers.get('referer') || '';
    const origin    = request.headers.get('origin') || '';
    const host      = request.headers.get('host');

    // Pastikan header X-ATS-Source ada (Handshake Apps)
    if (atsSource !== 'ats-web-app') {
      return new Response(
        renderErrorPage('API Ditolak', 'Permintaan API tidak sah.', 'API_HANDSHAKE_MISSING'),
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Validasi Referer: Harus berasal dari domain yang sama (mencegah Hotlinking/External Script)
    if (referer && !referer.includes(host)) {
      return new Response(
        renderErrorPage('Origin Ditolak', 'Permintaan dari luar aplikasi tidak diizinkan.', 'INVALID_API_ORIGIN'),
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      );
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