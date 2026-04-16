export async function onRequest(context) {
  const { request, next } = context;
  
  // Dapatkan detail negara pengunjung dari Cloudflare
  const country = request.cf?.country;

  // Daftar negara yang diizinkan (Hanya Indonesia)
  const ALLOWED_COUNTRY = 'ID';

  // Jika pengunjung berasal dari luar negeri (dan valid terbaca negaranya)
  if (country && country !== ALLOWED_COUNTRY) {
    // Tendang keluar dengan status 403 Forbidden
    return new Response(
      '<h1>Akses Ditolak | Access Denied</h1><p>Maaf, layanan Ujian CBT ini hanya dapat diakses dari wilayah <b>Indonesia</b>. (Trafik Anda terdeteksi dari: ' + country + ')</p>', 
      {
        status: 403,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
        }
      }
    );
  }

  // Jika dari Indonesia (ID) atau lokal, persilakan masuk dengan aman.
  return await next();
}
