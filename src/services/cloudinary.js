const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

/**
 * Upload file ke Cloudinary menggunakan unsigned preset
 * @param {File} file
 * @param {string} folder - subfolder di Cloudinary (opsional)
 * @returns {Promise<string|null>} secure_url atau null jika gagal
 */
export async function uploadToCloudinary(file, folder = 'ujian_sma') {
  const formData = new FormData()
  formData.append('file', file)
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
