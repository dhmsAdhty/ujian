<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '@/services/supabase'
import {
  Users, Search, ChevronLeft, ChevronRight, UserPlus,
  Mail, Calendar, ShieldCheck, ShieldAlert, ArrowUpDown,
  Pencil, Trash2, Upload,
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton, FormInput, EmptyState, AppSelect } from '@/components/ui'
import UserModal from '@/components/admin/UserModal.vue'
import UserImportModal from '@/components/admin/UserImportModal.vue'
import Swal from 'sweetalert2'

const users = ref([])
const loading = ref(true)
const searchQuery = ref('')
const roleFilter = ref('')
const page = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)
const sortBy = ref('created_at')
const sortOrder = ref('desc')
const showUserModal = ref(false)
const showImportModal = ref(false)
const editingUser = ref(null)

const fetchUsers = async () => {
  loading.value = true
  const from = (page.value - 1) * pageSize.value
  const to = from + pageSize.value - 1
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order(sortBy.value, { ascending: sortOrder.value === 'asc' })
  if (searchQuery.value) query = query.ilike('full_name', `%${searchQuery.value}%`)
  if (roleFilter.value) query = query.eq('role', roleFilter.value)
  const { data, count, error } = await query
  if (error) Swal.fire('Error', error.message, 'error')
  else { users.value = data; totalCount.value = count || 0 }
  loading.value = false
}

watch([searchQuery, roleFilter, sortBy, sortOrder, pageSize], () => { page.value = 1; fetchUsers() })
watch(page, fetchUsers)
onMounted(fetchUsers)

const toggleSort = (field) => {
  if (sortBy.value === field) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = field; sortOrder.value = 'desc' }
}

const openAdd = () => { editingUser.value = null; showUserModal.value = true }
const openEdit = (user) => { editingUser.value = user; showUserModal.value = true }

const handleDelete = async (user) => {
  const result = await Swal.fire({
    title: `Hapus ${user.full_name}?`,
    text: 'Akun ini akan dihapus secara permanen dari sistem.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e31a1a',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
  })
  if (!result.isConfirmed) return

  // Hapus via RPC function (security definer) agar bisa hapus auth.users
  const { error } = await supabase.rpc('delete_user_by_id', { target_user_id: user.id })

  if (error) {
    // Fallback: hapus profiles saja jika RPC belum ada
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id)
    if (profileError) {
      Swal.fire('Gagal', profileError.message, 'error')
      return
    }
  }

  Swal.fire({ icon: 'success', title: 'Berhasil dihapus', timer: 1200, showConfirmButton: false })
  fetchUsers()
}

const totalPages = () => Math.ceil(totalCount.value / pageSize.value)

const roleBadge = (role) => {
  if (role === 'admin') return { cls: 'bg-red-50 text-red-700 ring-1 ring-red-100', icon: ShieldAlert }
  if (role === 'guru') return { cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100', icon: ShieldCheck }
  return { cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100', icon: Users }
}

const initials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const avatarColor = (name) => {
  const colors = [
    'bg-primary-100 text-primary-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
  ]
  return colors[(name?.charCodeAt(0) || 0) % colors.length]
}
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-venus-900">Manajemen User</h1>
        <p class="mt-1 text-sm text-venus-400">Kelola akun, hak akses, dan profil civitas sekolah.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="pressable-soft flex items-center gap-2 rounded-xl border border-venus-200 bg-white px-4 py-2.5 text-sm font-semibold text-venus-700 shadow-ios-sm transition-colors hover:bg-venus-50"
          @click="showImportModal = true"
        >
          <Upload :size="16" />
          Import Excel
        </button>
        <PrimaryButton @click="openAdd">
          <UserPlus :size="16" />
          Tambah User
        </PrimaryButton>
      </div>
    </div>

    <!-- Filters -->
    <GlassCard padding="p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="flex-1">
          <FormInput v-model="searchQuery" placeholder="Cari nama lengkap..." :icon="Search" />
        </div>
        <div class="flex shrink-0 gap-3">
          <AppSelect
            v-model="roleFilter"
            placeholder="Semua Role"
            :options="[
              { value: 'admin', label: 'Administrator' },
              { value: 'guru', label: 'Guru' },
              { value: 'siswa', label: 'Siswa' },
            ]"
            class="w-44"
          />
          <AppSelect
            v-model="pageSize"
            :options="[
              { value: 10, label: '10 / hal' },
              { value: 25, label: '25 / hal' },
              { value: 50, label: '50 / hal' },
            ]"
            class="w-32"
          />
        </div>
      </div>
    </GlassCard>

    <!-- Table -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-venus-100 bg-venus-50/60 text-[10px] font-black uppercase tracking-[2px] text-venus-400">
              <th class="cursor-pointer px-6 py-4 hover:opacity-70" @click="toggleSort('full_name')">
                <div class="flex items-center gap-1.5">Nama <ArrowUpDown :size="11" /></div>
              </th>
              <th class="px-6 py-4">Email</th>
              <th class="px-6 py-4">Role</th>
              <th class="cursor-pointer px-6 py-4 hover:opacity-70" @click="toggleSort('last_login')">
                <div class="flex items-center gap-1.5">Login Terakhir <ArrowUpDown :size="11" /></div>
              </th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-venus-50">
              <td v-for="j in 5" :key="j" class="px-6 py-5">
                <div class="h-3.5 animate-pulse rounded-full bg-venus-100" />
              </td>
            </tr>
          </tbody>

          <tbody v-else-if="users.length === 0">
            <tr>
              <td colspan="5">
                <EmptyState title="User Tidak Ditemukan" description="Coba ubah kata kunci atau filter role." />
              </td>
            </tr>
          </tbody>

          <tbody v-else class="divide-y divide-venus-50">
            <tr v-for="user in users" :key="user.id" class="group transition-colors hover:bg-venus-50/40">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black" :class="avatarColor(user.full_name)">
                    {{ initials(user.full_name) }}
                  </div>
                  <span class="font-semibold text-venus-800">{{ user.full_name }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5 text-sm text-venus-500">
                  <Mail :size="13" class="shrink-0 text-venus-300" />
                  {{ user.email }}
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider" :class="roleBadge(user.role).cls">
                  <component :is="roleBadge(user.role).icon" :size="11" />
                  {{ user.role }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5 text-sm text-venus-400">
                  <Calendar :size="13" class="shrink-0" />
                  {{ user.last_login ? new Date(user.last_login).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah' }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" class="pressable-soft rounded-lg border border-venus-100 bg-white p-2 text-venus-400 shadow-ios-sm hover:border-primary-200 hover:text-primary-600" title="Edit" @click="openEdit(user)">
                    <Pencil :size="15" />
                  </button>
                  <button type="button" class="pressable-soft rounded-lg border border-venus-100 bg-white p-2 text-venus-400 shadow-ios-sm hover:border-red-200 hover:text-red-600" title="Hapus" @click="handleDelete(user)">
                    <Trash2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && users.length > 0" class="flex flex-col items-center justify-between gap-4 border-t border-venus-100 bg-venus-50/40 px-6 py-4 sm:flex-row">
        <p class="text-sm text-venus-400">
          Menampilkan
          <span class="font-semibold text-venus-700">{{ (page - 1) * pageSize + 1 }}</span>–<span class="font-semibold text-venus-700">{{ Math.min(page * pageSize, totalCount) }}</span>
          dari <span class="font-semibold text-venus-700">{{ totalCount }}</span> user
        </p>
        <div class="flex items-center gap-1.5">
          <button :disabled="page === 1" class="pressable-soft rounded-lg border border-venus-100 bg-white p-2 text-venus-400 shadow-ios-sm hover:border-venus-200 disabled:opacity-40" @click="page--">
            <ChevronLeft :size="16" />
          </button>
          <template v-for="p in totalPages()" :key="p">
            <button
              v-show="Math.abs(p - page) <= 1 || p === 1 || p === totalPages()"
              class="h-8 w-8 rounded-lg text-sm font-semibold transition-colors"
              :class="page === p ? 'bg-primary-600 text-white shadow-ios-sm' : 'text-venus-500 hover:bg-venus-100'"
              @click="page = p"
            >{{ p }}</button>
            <span v-if="(p === 1 && page > 3) || (p === totalPages() - 1 && page < totalPages() - 2)" class="px-1 text-venus-300">…</span>
          </template>
          <button :disabled="page >= totalPages()" class="pressable-soft rounded-lg border border-venus-100 bg-white p-2 text-venus-400 shadow-ios-sm hover:border-venus-200 disabled:opacity-40" @click="page++">
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>
    </GlassCard>

    <UserModal :show="showUserModal" :edit-user="editingUser" @close="showUserModal = false" @saved="fetchUsers" />
    <UserImportModal :show="showImportModal" @close="showImportModal = false" @imported="fetchUsers" />
  </div>
</template>