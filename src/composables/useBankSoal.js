import { ref } from 'vue'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import Swal from 'sweetalert2'
import { toast } from 'gooey-toast'

export function useBankSoal() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const items = ref([])
  const totalItems = ref(0)

  async function fetchGuruSoal(options = {}) {
    if (!authStore.user) return
    
    loading.value = true
    const { 
      page = 1, 
      pageSize = 10, 
      search = '', 
      tipe = '', 
      mapelId = '', 
      kelasId = '' 
    } = options

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('bank_soal')
      .select('*, mapel(nama), kelas(nama)', { count: 'exact' })
      .eq('guru_id', authStore.user.id)
      .is('deleted_at', null) // Soft delete check
      .range(from, to)
      .order('created_at', { ascending: true })

    // Cari di judul DAN konten agar soal lama (judul kosong) tetap ditemukan
    if (search) query = query.or(`judul.ilike.%${search}%,konten.ilike.%${search}%`)
    if (tipe) query = query.eq('tipe_soal', tipe)
    if (mapelId) query = query.eq('mapel_id', mapelId)
    if (kelasId) query = query.eq('kelas_id', kelasId)

    const { data, count, error } = await query

    if (error) {
      toast.error({ title: 'Error', description: error.message })
    } else {
      items.value = data
      totalItems.value = count || 0
    }
    loading.value = false
  }

  async function softDeleteSoal(id) {
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Soal akan dipindahkan ke tempat sampah dan tidak akan muncul di ujian.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4318ff',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    })

    if (result.isConfirmed) {
      const { error } = await supabase
        .from('bank_soal')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('guru_id', authStore.user.id) // Security: Isolation check

      if (error) {
        toast.error({ title: 'Gagal', description: error.message })
        return false
      } else {
        toast.success({ title: 'Terhapus!', description: 'Soal berhasil dihapus.' })
        return true
      }
    }
    return false
  }

  async function bulkDeleteSoal(ids) {
    const result = await Swal.fire({
      title: `Hapus ${ids.length} soal?`,
      text: 'Soal yang dipilih akan dipindahkan ke tempat sampah.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal'
    })

    if (result.isConfirmed) {
      const { error } = await supabase
        .from('bank_soal')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
        .eq('guru_id', authStore.user.id)

      if (error) {
        toast.error({ title: 'Gagal', description: error.message })
        return false
      } else {
        toast.success({ title: 'Terhapus!', description: `${ids.length} soal berhasil dihapus.` })
        return true
      }
    }
    return false
  }

  return {
    loading,
    items,
    totalItems,
    fetchGuruSoal,
    softDeleteSoal,
    bulkDeleteSoal
  }
}
