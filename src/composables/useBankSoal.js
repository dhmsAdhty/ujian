import { ref } from 'vue'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import Swal from 'sweetalert2'

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
      .select('*, mapels(nama), kelas(nama)', { count: 'exact' })
      .eq('guru_id', authStore.user.id)
      .is('deleted_at', null) // Soft delete check
      .range(from, to)
      .order('created_at', { ascending: false })

    if (search) query = query.ilike('judul', `%${search}%`)
    if (tipe) query = query.eq('tipe_soal', tipe)
    if (mapelId) query = query.eq('mapel_id', mapelId)
    if (kelasId) query = query.eq('kelas_id', kelasId)

    const { data, count, error } = await query

    if (error) {
      Swal.fire('Error', error.message, 'error')
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
      confirmButtonColor: '#f97316',
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
        Swal.fire('Gagal', error.message, 'error')
        return false
      } else {
        Swal.fire('Terhapus!', 'Soal berhasil dihapus.', 'success')
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
    softDeleteSoal
  }
}
