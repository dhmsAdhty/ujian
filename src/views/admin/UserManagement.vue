<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '@/services/supabase'
import { 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
  UserPlus,
  Mail,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton, FormInput, EmptyState } from '@/components/ui'
import Swal from 'sweetalert2'

// State
const users = ref([])
const loading = ref(true)
const searchQuery = ref('')
const roleFilter = ref('')
const page = ref(1)
const pageSize = 10
const totalCount = ref(0)
const sortBy = ref('created_at')
const sortOrder = ref('desc')

// Fetch Logic (Server-Side)
const fetchUsers = async () => {
  loading.value = true
  const from = (page.value - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order(sortBy.value, { ascending: sortOrder.value === 'asc' })

  if (searchQuery.value) {
    query = query.ilike('full_name', `%${searchQuery.value}%`)
  }

  if (roleFilter.value) {
    query = query.eq('role', roleFilter.value)
  }

  const { data, count, error } = await query

  if (error) {
    Swal.fire('Error', error.message, 'error')
  } else {
    users.value = data
    totalCount.value = count || 0
  }
  loading.value = false
}

// Watchers for reactive fetching
watch([searchQuery, roleFilter, sortBy, sortOrder], () => {
  page.value = 1
  fetchUsers()
})

watch(page, fetchUsers)

onMounted(fetchUsers)

const toggleSort = (field) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
}

const getRoleBadgeClass = (role) => {
  if (role === 'admin') return 'bg-red-100 text-red-700'
  if (role === 'guru') return 'bg-orange-100 text-orange-700'
  return 'bg-blue-100 text-blue-700'
}

const getRoleIcon = (role) => {
  if (role === 'admin') return ShieldAlert
  if (role === 'guru') return ShieldCheck
  return Users
}
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header Area -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Manajemen User</h1>
        <p class="text-slate-500 mt-1">Kelola data login, hak akses, dan profil seluruh civitas sekolah.</p>
      </div>
      <PrimaryButton class="shadow-xl">
        <UserPlus :size="18" />
        Tambah User
      </PrimaryButton>
    </div>

    <!-- Filters & Search -->
    <GlassCard padding="p-4">
      <div class="flex flex-col lg:flex-row gap-4 items-center">
        <div class="w-full lg:flex-1">
          <FormInput 
            v-model="searchQuery"
            placeholder="Cari berdasarkan nama lengkap..."
            :icon="Search"
          />
        </div>
        <div class="flex gap-4 w-full lg:w-auto">
          <select 
            v-model="roleFilter"
            class="form-input lg:w-48 bg-white border-slate-200"
          >
            <option value="">Semua Role</option>
            <option value="admin">Administrator</option>
            <option value="guru">Guru</option>
            <option value="siswa">Siswa</option>
          </select>
          <select 
            class="form-input lg:w-48 bg-white border-slate-200"
            @change="page = 1; fetchUsers()"
          >
            <option value="10">10 Per Halaman</option>
            <option value="25">25 Per Halaman</option>
            <option value="50">50 Per Halaman</option>
          </select>
        </div>
      </div>
    </GlassCard>

    <!-- Content Table -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[2px] border-b border-slate-100">
              <th @click="toggleSort('full_name')" class="py-5 px-6 cursor-pointer hover:text-primary-600 transition-colors">
                <div class="flex items-center gap-2">
                  Nama Lengkap <ArrowUpDown :size="12" />
                </div>
              </th>
              <th class="py-5 px-6">Email / Username</th>
              <th class="py-5 px-6">Role</th>
              <th @click="toggleSort('last_login')" class="py-5 px-6 cursor-pointer hover:text-primary-600 transition-colors">
                <div class="flex items-center gap-2">
                  Terakhir Login <ArrowUpDown :size="12" />
                </div>
              </th>
              <th class="py-5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-slate-50/50">
              <td v-for="j in 5" :key="j" class="py-6 px-6">
                <div class="h-4 bg-slate-100 rounded-full animate-pulse"></div>
              </td>
            </tr>
          </tbody>

          <tbody v-else-if="users.length === 0">
            <tr>
              <td colspan="5">
                <EmptyState 
                  title="User Tidak Ditemukan"
                  description="Coba gunakan kata kunci pencarian lain atau ubah filter role."
                />
              </td>
            </tr>
          </tbody>

          <tbody v-else class="divide-y divide-slate-50">
            <tr v-for="user in users" :key="user.id" class="group hover:bg-slate-50/50 transition-all duration-300">
              <td class="py-5 px-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-600 border border-white">
                    {{ user.full_name?.charAt(0) || 'U' }}
                  </div>
                  <span class="font-bold text-slate-700 tracking-tight">{{ user.full_name }}</span>
                </div>
              </td>
              <td class="py-5 px-6">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                    <Mail :size="14" class="text-slate-400" />
                    {{ user.email }}
                  </span>
                  <span class="text-[10px] text-slate-400 mt-0.5 ml-5 uppercase font-bold tracking-wider">ID: {{ user.id.split('-')[0] }}</span>
                </div>
              </td>
              <td class="py-5 px-6">
                <span 
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                  :class="getRoleBadgeClass(user.role)"
                >
                  <component :is="getRoleIcon(user.role)" :size="12" />
                  {{ user.role }}
                </span>
              </td>
              <td class="py-5 px-6 text-sm text-slate-500 font-medium">
                <div class="flex items-center gap-2">
                  <Calendar :size="14" />
                  {{ user.last_login ? new Date(user.last_login).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum Pernah' }}
                </div>
              </td>
              <td class="py-5 px-6 text-right">
                <button class="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-primary-500 transition-all">
                  <MoreVertical :size="18" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="!loading && users.length > 0" class="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-sm font-bold text-slate-500">
          Showing <span class="text-slate-900">{{ (page - 1) * pageSize + 1 }}</span> to <span class="text-slate-900">{{ Math.min(page * pageSize, totalCount) }}</span> of <span class="text-slate-900">{{ totalCount }}</span> results
        </p>
        <div class="flex items-center gap-2">
          <button 
            @click="page--"
            :disabled="page === 1"
            class="p-2.5 rounded-xl border border-slate-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-all"
          >
            <ChevronLeft :size="18" />
          </button>
          
          <div class="flex items-center">
            <button 
              v-for="p in Math.ceil(totalCount / pageSize)" 
              :key="p"
              @click="page = p"
              class="w-10 h-10 rounded-xl text-sm font-bold transition-all"
              :class="page === p ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-slate-500 hover:bg-white hover:text-primary-600'"
              v-show="Math.abs(p - page) <= 1 || p === 1 || p === Math.ceil(totalCount / pageSize)"
            >
              {{ p }}
            </button>
          </div>

          <button 
            @click="page++"
            :disabled="page >= Math.ceil(totalCount / pageSize)"
            class="p-2.5 rounded-xl border border-slate-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-all"
          >
            <ChevronRight :size="18" />
          </button>
        </div>
      </div>
    </GlassCard>
  </div>
</template>
