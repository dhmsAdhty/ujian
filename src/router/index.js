import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/auth/ResetPasswordView.vue'),
    },
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        { path: '', name: 'admin-dashboard', component: () => import('@/views/admin/DashboardView.vue') },
        { path: 'users', name: 'admin-users', component: () => import('@/views/admin/UserManagement.vue') },
        { path: 'mapel', name: 'admin-mapel', component: () => import('@/views/admin/MapelView.vue') },
        { path: 'penugasan', name: 'admin-penugasan', component: () => import('@/views/admin/PenugasanGuru.vue') },
        { path: 'soal', name: 'admin-soal', component: () => import('@/views/admin/StatistikSoal.vue') },
        { path: 'kelas', name: 'admin-kelas', component: () => import('@/views/admin/KelasView.vue') },
        { path: 'laporan', name: 'admin-laporan', component: () => import('@/views/admin/PlaceholderView.vue') },
        { path: 'settings', name: 'admin-settings', component: () => import('@/views/admin/PlaceholderView.vue') },
      ]
    },
    {
      path: '/guru',
      component: () => import('@/views/guru/GuruLayout.vue'),
      meta: { requiresAuth: true, role: 'guru' },
      children: [
        { path: '', name: 'guru-dashboard', component: () => import('@/views/guru/DashboardView.vue') },
        { path: 'soal', name: 'guru-soal', component: () => import('@/views/guru/BankSoal.vue') },
        { path: 'soal/tambah', name: 'guru-soal-tambah', component: () => import('@/views/guru/SoalForm.vue') },
        { path: 'soal/edit/:id', name: 'guru-soal-edit', component: () => import('@/views/guru/SoalForm.vue') },
        { path: 'nilai', name: 'guru-nilai', component: () => import('@/views/guru/RekapNilai.vue') },
        { path: 'jadwal', name: 'guru-jadwal', component: () => import('@/views/guru/JadwalUjian.vue') },
      ]
    },
    {
      path: '/siswa',
      component: () => import('@/views/siswa/SiswaLayout.vue'),
      meta: { requiresAuth: true, role: 'siswa' },
      children: [
        { path: '', name: 'siswa-examine', component: () => import('@/views/siswa/DashboardView.vue') },
        { path: 'ujian/:id', name: 'siswa-aktif', component: () => import('@/views/siswa/ActiveExam.vue') }
      ]
    }
  ]
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // Wait for session to be restored before any guard check
  if (!authStore.initialized) {
    await authStore.init()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    const role = authStore.role
    if (role === 'admin') return '/admin'
    if (role === 'guru') return '/guru'
    if (role === 'siswa') return '/siswa'
    return '/login'
  }

  if (to.meta.role && authStore.role !== to.meta.role) {
    return '/'
  }
})

export default router
