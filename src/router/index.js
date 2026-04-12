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
      path: '/',
      redirect: '/login'
    },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        { path: '', name: 'admin-dashboard', component: () => import('@/views/admin/DashboardView.vue') },
        { path: 'users', name: 'admin-users', component: () => import('@/views/admin/UserManagement.vue') }
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
        { path: 'nilai', name: 'guru-nilai', component: () => import('@/views/guru/RekapNilai.vue') }
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

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.guestOnly && authStore.isAuthenticated) {
    // Redirect to respective dashboard based on role
    const role = authStore.role
    if (role === 'admin') next('/admin')
    else if (role === 'guru') next('/guru')
    else if (role === 'siswa') next('/siswa')
    else next('/login')
  } else if (to.meta.role && authStore.role !== to.meta.role) {
    next('/') // Unauthorized
  } else {
    next()
  }
})

export default router
