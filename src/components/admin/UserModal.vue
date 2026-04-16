<script setup>
import { ref, watch, onMounted } from 'vue'
import { supabase } from '@/services/supabase'
import { X, User, KeyRound } from 'lucide-vue-next'
import { FormInput, AppSelect, PrimaryButton } from '@/components/ui'
import Swal from 'sweetalert2'

const props = defineProps({
  show: Boolean,
  editUser: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const saving = ref(false)
const form = ref({ full_name: '', email: '', password: '', role: '', kelas_id: '' })
const errors = ref({})
const kelasList = ref([])

const roleOptions = [
  { value: 'admin', label: 'Administrator' },
  { value: 'guru', label: 'Guru' },
  { value: 'siswa', label: 'Siswa' },
]

onMounted(async () => {
  const { data } = await supabase.from('kelas').select('id, nama').order('nama')
  kelasList.value = data || []
})

watch(
  () => props.editUser,
  (u) => {
    if (u) {
      form.value = { full_name: u.full_name || '', email: u.email || '', password: '', role: u.role || '', kelas_id: u.kelas_id || '' }
    } else {
      form.value = { full_name: '', email: '', password: '', role: '', kelas_id: '' }
    }
    errors.value = {}
  },
  { immediate: true },
)

const resettingPassword = ref(false)

const validate = () => {
  const e = {}
  if (!form.value.full_name.trim()) e.full_name = 'Nama wajib diisi'
  if (!form.value.email.trim()) e.email = 'Email wajib diisi'
  if (!props.editUser && !form.value.password) e.password = 'Password wajib diisi untuk user baru'
  if (form.value.password && form.value.password.length < 6) e.password = 'Password minimal 6 karakter'
  if (!form.value.role) e.role = 'Role wajib dipilih'
  if (form.value.role === 'siswa' && !form.value.kelas_id) e.kelas_id = 'Kelas wajib dipilih untuk siswa'
  errors.value = e
  return Object.keys(e).length === 0
}

const handleResetPassword = async () => {
  if (!props.editUser?.email) return
  const result = await Swal.fire({
    title: 'Reset Password?',
    html: `Kirim email reset password ke<br><b>${props.editUser.email}</b>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#4318ff',
    confirmButtonText: 'Ya, Kirim',
    cancelButtonText: 'Batal',
  })
  if (!result.isConfirmed) return

  resettingPassword.value = true
  const { error } = await supabase.auth.resetPasswordForEmail(props.editUser.email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  resettingPassword.value = false

  if (error) {
    Swal.fire('Gagal', error.message, 'error')
  } else {
    Swal.fire({
      icon: 'success',
      title: 'Email Terkirim',
      text: `Link reset password telah dikirim ke ${props.editUser.email}`,
      confirmButtonColor: '#4318ff',
    })
  }
}
const handleSave = async () => {
  if (!validate()) return
  saving.value = true

  try {
    if (props.editUser) {
      // Selalu update langsung ke profiles dengan semua field sekaligus
      const { data: updatedRows, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: form.value.full_name,
          role: form.value.role,
          kelas_id: form.value.role === 'siswa' ? (form.value.kelas_id || null) : null
        })
        .eq('id', props.editUser.id)
        .select()

      if (profileError) throw profileError

      // Jika tidak ada baris yang diupdate, kemungkinan RLS memblokir
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(
          'UPDATE_BLOCKED: Update diblokir oleh RLS policy Supabase.\n\n' +
          'Jalankan SQL ini di Supabase Dashboard → SQL Editor:\n\n' +
          'CREATE POLICY "Admin can update any profile"\n' +
          'ON profiles FOR UPDATE TO authenticated\n' +
          'USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\'))\n' +
          'WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\'));'
        )
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.value.email,
        password: form.value.password,
        options: {
          data: {
            full_name: form.value.full_name,
            role: form.value.role,
          },
        },
      })
      if (error) throw error
      // Update kelas_id setelah trigger buat profiles
      if (form.value.role === 'siswa' && data.user) {
        await supabase
          .from('profiles')
          .update({ kelas_id: form.value.kelas_id })
          .eq('id', data.user.id)
      }
    }

    emit('saved')
    emit('close')
  } catch (err) {
    const msg = err.message || ''
    if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email rate')) {
      Swal.fire({
        icon: 'warning',
        title: 'Email Rate Limit',
        html: `Supabase Free Plan membatasi pengiriman email konfirmasi.<br><br>
          <b>Solusi:</b> Matikan "Enable email confirmations" di<br>
          <i>Supabase Dashboard → Authentication → Providers → Email</i>`,
        confirmButtonColor: '#4318ff',
      })
    } else {
      Swal.fire('Gagal', msg, 'error')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @mousedown.self="emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-venus-900/40 backdrop-blur-sm" />

        <!-- Modal -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
        >
          <div
            v-if="show"
            class="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-venus-100 bg-white shadow-venus"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-venus-100 px-6 py-5">
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                  <User :size="18" stroke-width="2" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-venus-900">
                    {{ editUser ? 'Edit User' : 'Tambah User Baru' }}
                  </h3>
                  <p class="text-xs text-venus-400">
                    {{ editUser ? 'Perbarui data profil dan role' : 'Buat akun baru untuk civitas sekolah' }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="pressable-soft rounded-lg p-1.5 text-venus-400 transition-colors hover:bg-venus-100"
                @click="emit('close')"
              >
                <X :size="18" />
              </button>
            </div>

            <!-- Body -->
            <div class="space-y-4 px-6 py-6">
              <FormInput
                v-model="form.full_name"
                label="Nama Lengkap"
                placeholder="Contoh: Budi Santoso"
                :error="errors.full_name"
              />

              <FormInput
                v-model="form.email"
                label="Email"
                type="email"
                placeholder="nama@sekolah.sch.id"
                :error="errors.email"
                :disabled="!!editUser"
              />

              <FormInput
                v-if="!editUser"
                v-model="form.password"
                label="Password"
                type="password"
                placeholder="Minimal 6 karakter"
                :error="errors.password"
              />

              <AppSelect
                v-model="form.role"
                label="Role"
                placeholder="Pilih role..."
                :options="roleOptions"
                :error="errors.role"
              />

              <!-- Kelas — hanya muncul jika role siswa -->
              <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
              >
                <AppSelect
                  v-if="form.role === 'siswa'"
                  v-model="form.kelas_id"
                  label="Kelas"
                  placeholder="Pilih kelas siswa..."
                  :options="kelasList.map(k => ({ value: k.id, label: k.nama }))"
                  :error="errors.kelas_id"
                />
              </Transition>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between border-t border-venus-100 px-6 py-4">
              <!-- Reset password button (edit mode only) -->
              <button
                v-if="editUser"
                type="button"
                class="pressable-soft flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-50"
                :disabled="resettingPassword"
                @click="handleResetPassword"
              >
                <KeyRound :size="15" />
                {{ resettingPassword ? 'Mengirim...' : 'Reset Password' }}
              </button>
              <div v-else />

              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="rounded-xl px-5 py-2.5 text-sm font-semibold text-venus-500 transition-colors hover:bg-venus-50"
                  @click="emit('close')"
                >
                  Batal
                </button>
                <PrimaryButton :loading="saving" @click="handleSave">
                  {{ editUser ? 'Simpan Perubahan' : 'Buat Akun' }}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
