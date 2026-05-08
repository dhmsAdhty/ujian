const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

/**
 * Kompres gambar di browser sebelum upload:
 * - Resize ke maks 1280px (lebar atau tinggi)
 * - Konversi ke JPEG quality 85%
 * Hasilnya: file 3–8 MB bisa jadi ~150–300 KB → upload jauh lebih cepat
 * @param {File} file
 * @returns {Promise<Blob>}
 */
function compressImage(file) {
  return new Promise((resolve) => {
    const MAX_SIZE = 1280
    const QUALITY = 0.85

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width)
          width = MAX_SIZE
        } else {
          width = Math.round((width * MAX_SIZE) / height)
          height = MAX_SIZE
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        QUALITY
      )
    }

    img.src = objectUrl
  })
}

/**
 * Upload file ke Cloudinary menggunakan unsigned preset.
 * Gambar dikompres otomatis di browser sebelum dikirim.
 * @param {File} file
 * @param {string} folder - subfolder di Cloudinary (opsional)
 * @returns {Promise<string|null>} secure_url atau null jika gagal
 */
export async function uploadToCloudinary(file, folder = 'ujian_sma') {
  // Kompres sebelum upload jika file adalah gambar
  const compressed = file.type.startsWith('image/')
    ? await compressImage(file)
    : file

  const formData = new FormData()
  formData.append('file', compressed, file.name.replace(/\.[^.]+$/, '.jpg'))
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) return null

  const data = await res.json()
  return data.secure_url ?? null
}
