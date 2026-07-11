<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  ArrowDown,
  LogIn,
  Menu,
  X,
  ShieldCheck,
  BarChart3,
  Archive,
  Users,
  Lock,
  CheckCircle2,
  Crown,
  BookOpen,
  GraduationCap,
  ClipboardList,
} from 'lucide-vue-next'

const router = useRouter()
const currentYear = new Date().getFullYear()

const scrolled = ref(false)
const activeSection = ref('hero')
const mobileMenuOpen = ref(false)

const statsVisible = ref(false)
const statsRef = ref(null)
const displayStats = ref({ siswa: 0, ujian: 0, mapel: 0, uptime: 0 })
const targetStats = { siswa: 1200, ujian: 450, mapel: 24, uptime: 99 }

function animateCounter(key, target, duration = 1400) {
  const start = performance.now()
  const update = (now) => {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    displayStats.value[key] = Math.floor(eased * target)
    if (progress < 1) requestAnimationFrame(update)
    else displayStats.value[key] = target
  }
  requestAnimationFrame(update)
}

let sectionObserver = null
let statsObserver = null
let revealObserver = null

onMounted(() => {
  window.addEventListener('scroll', handleScroll)

  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) activeSection.value = e.target.id
      })
    },
    { threshold: 0.4 },
  )
  document.querySelectorAll('section[id]').forEach((s) => sectionObserver.observe(s))

  statsObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !statsVisible.value) {
        statsVisible.value = true
        Object.entries(targetStats).forEach(([k, v]) => animateCounter(k, v))
      }
    },
    { threshold: 0.3 },
  )
  if (statsRef.value) statsObserver.observe(statsRef.value)

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          revealObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  )
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el))
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  sectionObserver?.disconnect()
  statsObserver?.disconnect()
  revealObserver?.disconnect()
})

function handleScroll() {
  scrolled.value = window.scrollY > 40
}

function scrollTo(id) {
  mobileMenuOpen.value = false
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function goToLogin() {
  router.push('/login')
}

const features = [
  {
    icon: ShieldCheck,
    tag: '01',
    title: 'Anti-Kecurangan',
    desc: 'Deteksi perpindahan tab, fullscreen enforcement, dan monitoring real-time untuk menjaga integritas ujian.',
  },
  {
    icon: CheckCircle2,
    tag: '02',
    title: 'Penilaian Otomatis',
    desc: 'Koreksi jawaban instan dengan analisis skor mendalam, rekap nilai per kelas, dan ekspor laporan dalam hitungan detik.',
  },
  {
    icon: BarChart3,
    tag: '03',
    title: 'Dashboard Analitik',
    desc: 'Visualisasi performa siswa berbasis data real-time — identifikasi pola belajar dan tingkat ketuntasan dengan mudah.',
  },
  {
    icon: Archive,
    tag: '04',
    title: 'Bank Soal Terorganisir',
    desc: 'Kelola ribuan soal per mata pelajaran dengan kategori, tingkat kesulitan, dan tag yang terstruktur rapi.',
  },
  {
    icon: Users,
    tag: '05',
    title: 'Multi-Role Access',
    desc: 'Tiga level akses terpisah — Admin, Guru, dan Siswa — dengan tampilan dashboard dan hak akses yang berbeda.',
  },
  {
    icon: Lock,
    tag: '06',
    title: 'Keamanan Enterprise',
    desc: 'Autentikasi berlapis dengan Cloudflare Turnstile CAPTCHA, enkripsi data, dan audit log aktivitas pengguna.',
  },
]

const steps = [
  {
    icon: LogIn,
    num: '01',
    title: 'Login & Pilih Ujian',
    desc: 'Siswa masuk dengan akun sekolah dan memilih jadwal ujian yang tersedia.',
  },
  {
    icon: ClipboardList,
    num: '02',
    title: 'Kerjakan Soal',
    desc: 'Antarmuka ujian yang bersih, intuitif, dan bebas gangguan untuk fokus maksimal.',
  },
  {
    icon: CheckCircle2,
    num: '03',
    title: 'Nilai Otomatis',
    desc: 'Skor dihitung real-time, langsung tersedia untuk guru dan laporan sekolah.',
  },
]

const roles = [
  {
    code: 'ROLE / 01',
    title: 'Admin',
    icon: Crown,
    desc: 'Kelola seluruh sistem — pengguna, mata pelajaran, jadwal ujian, dan laporan nilai secara terpusat.',
    perks: [
      'Manajemen pengguna lengkap',
      'Jadwal ujian & kelas',
      'Laporan nilai & statistik',
      'Monitoring aktivitas',
    ],
  },
  {
    code: 'ROLE / 02',
    title: 'Guru',
    icon: BookOpen,
    desc: 'Buat soal, atur ujian per mata pelajaran yang diampu, dan pantau performa siswa secara real-time.',
    perks: [
      'Bank soal per mapel',
      'Buat & jadwalkan ujian',
      'Rekap & ekspor nilai',
      'Monitoring pelanggaran',
    ],
  },
  {
    code: 'ROLE / 03',
    title: 'Siswa',
    icon: GraduationCap,
    desc: 'Akses ujian yang dijadwalkan dengan mudah. Antarmuka bersih, responsif, dan ramah pengguna.',
    perks: [
      'Lihat jadwal ujian',
      'Mode ujian fullscreen',
      'Navigasi antar soal',
      'Riwayat hasil ujian',
    ],
  },
]

const navLinks = [
  { id: 'features', label: 'Fitur' },
  { id: 'how-it-works', label: 'Cara Kerja' },
  { id: 'roles', label: 'Pengguna' },
]

const trustStrip = ['Auto-graded', 'Anti-cheat real-time', 'Analitik mendalam']
</script>

<template>
  <div class="landing-root">
    <!-- ═══ NAVBAR ═══ -->
    <header :class="['navbar', { 'navbar--scrolled': scrolled }]" role="banner">
      <nav class="nav-inner" aria-label="Navigasi utama">
        <a
          href="#hero"
          class="nav-brand"
          @click.prevent="scrollTo('hero')"
          aria-label="CBT ATS Home"
        >
          <div class="brand-icon">
            <img src="/ATSLogo -trans.png" alt="Logo CBT ATS" class="brand-img" />
          </div>
          <div class="brand-text">
            <span class="brand-name">CBT ATS</span>
            <span class="brand-sub">Computer Based Test</span>
          </div>
        </a>

        <ul class="nav-links" role="list">
          <li v-for="link in navLinks" :key="link.id">
            <a
              :href="`#${link.id}`"
              :class="['nav-link', { 'is-active': activeSection === link.id }]"
              @click.prevent="scrollTo(link.id)"
              >{{ link.label }}</a
            >
          </li>
        </ul>

        <div class="nav-cta">
          <button id="nav-login-btn" class="btn-primary-sm" @click="goToLogin">
            Masuk
            <ArrowRight :size="15" stroke-width="2.25" />
          </button>
        </div>

        <button
          class="hamburger"
          :aria-expanded="mobileMenuOpen"
          aria-label="Toggle menu"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <component :is="mobileMenuOpen ? X : Menu" :size="20" color="#14172B" stroke-width="2" />
        </button>
      </nav>

      <div :class="['mobile-menu', { 'is-open': mobileMenuOpen }]" :aria-hidden="!mobileMenuOpen">
        <ul role="list">
          <li v-for="link in navLinks" :key="link.id">
            <a :href="`#${link.id}`" class="mobile-link" @click.prevent="scrollTo(link.id)">
              {{ link.label }}
            </a>
          </li>
        </ul>
        <button class="btn-primary-full" @click="goToLogin">
          Masuk ke Sistem
          <LogIn :size="17" stroke-width="2.25" />
        </button>
      </div>
    </header>

    <!-- ═══ HERO ═══ -->
    <section id="hero" class="hero-section" aria-labelledby="hero-heading">
      <div class="container hero-container">
        <div class="hero-badge animate-fade-up">
          <span class="badge-dot" aria-hidden="true" />
          Platform CBT Sekolah Tahfidz Al Hikmah
        </div>

        <h1 id="hero-heading" class="hero-title animate-fade-up delay-1">
          Sistem Ujian Digital<br />
          <span class="accent-text">Modern & Terpercaya</span>
        </h1>

        <p class="hero-desc animate-fade-up delay-2">
          Platform <strong>Computer Based Test</strong> yang dirancang khusus untuk Sekolah Tahfidz
          Al Hikmah. Ujian lebih terstruktur, transparan, dan anti-kecurangan — untuk hasil belajar
          yang lebih baik.
        </p>

        <div class="hero-ctas animate-fade-up delay-3">
          <button id="hero-cta-primary" class="btn-primary" @click="goToLogin">
            Mulai Sekarang
            <ArrowRight :size="17" stroke-width="2.25" />
          </button>
          <button id="hero-cta-outline" class="btn-outline" @click="scrollTo('features')">
            Lihat Fitur
            <ArrowDown :size="17" stroke-width="2.25" />
          </button>
        </div>

        <div class="trust-strip animate-fade-up delay-4" aria-hidden="true">
          <template v-for="(item, i) in trustStrip" :key="item">
            <span class="trust-item">{{ item }}</span>
            <span v-if="i < trustStrip.length - 1" class="trust-sep">/</span>
          </template>
        </div>
      </div>

      <a
        href="#features"
        class="scroll-hint"
        @click.prevent="scrollTo('features')"
        aria-label="Scroll ke fitur"
      >
        <div class="scroll-mouse">
          <div class="scroll-wheel" />
        </div>
      </a>
    </section>

    <!-- ═══ STATS ═══ -->
    <div ref="statsRef" class="stats-bar">
      <div class="container stats-grid">
        <div class="stat-item">
          <span class="stat-num">{{ displayStats.siswa.toLocaleString('id-ID') }}+</span>
          <span class="stat-label">Siswa Terdaftar</span>
        </div>
        <div class="stat-sep" aria-hidden="true" />
        <div class="stat-item">
          <span class="stat-num">{{ displayStats.ujian }}+</span>
          <span class="stat-label">Ujian Dilaksanakan</span>
        </div>
        <div class="stat-sep" aria-hidden="true" />
        <div class="stat-item">
          <span class="stat-num">{{ displayStats.mapel }}</span>
          <span class="stat-label">Mata Pelajaran</span>
        </div>
        <div class="stat-sep" aria-hidden="true" />
        <div class="stat-item">
          <span class="stat-num">{{ displayStats.uptime }}%</span>
          <span class="stat-label">Uptime Sistem</span>
        </div>
      </div>
    </div>

    <!-- ═══ FEATURES ═══ -->
    <section id="features" class="section" aria-labelledby="features-heading">
      <div class="container">
        <div class="section-header">
          <div class="section-tag">Fitur Unggulan</div>
          <h2 id="features-heading" class="section-title">
            Semua yang Anda Butuhkan,<br />
            <span class="accent-text">Dalam Satu Platform</span>
          </h2>
          <p class="section-desc">
            Dirancang dengan mempertimbangkan kebutuhan nyata sekolah — dari pembuatan soal hingga
            pelaporan nilai.
          </p>
        </div>

        <div class="features-grid" role="list">
          <article
            v-for="(feat, i) in features"
            :key="feat.title"
            class="feat-card reveal"
            :class="`delay-${(i % 3) + 1}`"
            role="listitem"
          >
            <div class="feat-top">
              <span class="feat-tag">{{ feat.tag }}</span>
              <component :is="feat.icon" :size="22" class="feat-icon" stroke-width="1.75" />
            </div>
            <h3 class="feat-title">{{ feat.title }}</h3>
            <p class="feat-desc">{{ feat.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ═══ HOW IT WORKS ═══ -->
    <section id="how-it-works" class="section section-alt" aria-labelledby="how-heading">
      <div class="container">
        <div class="section-header">
          <div class="section-tag">Cara Kerja</div>
          <h2 id="how-heading" class="section-title">
            Mudah, Cepat,<br /><span class="accent-text">dan Efisien</span>
          </h2>
        </div>

        <div class="steps-grid">
          <div class="steps-connector" aria-hidden="true" />
          <div
            v-for="(step, i) in steps"
            :key="step.num"
            class="step-card reveal"
            :class="`delay-${i + 1}`"
          >
            <div class="step-icon-wrap">
              <span class="step-num">{{ step.num }}</span>
              <component :is="step.icon" :size="24" class="step-icon" stroke-width="1.75" />
            </div>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-desc">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ ROLES ═══ -->
    <section id="roles" class="section" aria-labelledby="roles-heading">
      <div class="container">
        <div class="section-header">
          <div class="section-tag">Untuk Siapa</div>
          <h2 id="roles-heading" class="section-title">
            Satu Platform,<br /><span class="accent-text">Tiga Peran</span>
          </h2>
          <p class="section-desc">
            Setiap pengguna mendapatkan pengalaman yang disesuaikan dengan kebutuhan dan tanggung
            jawabnya.
          </p>
        </div>

        <div class="roles-grid">
          <article
            v-for="(role, i) in roles"
            :key="role.title"
            class="role-card reveal"
            :class="`delay-${i + 1}`"
          >
            <div class="role-header">
              <component :is="role.icon" :size="26" class="role-icon" stroke-width="1.6" />
              <span class="role-code">{{ role.code }}</span>
            </div>

            <h3 class="role-title">{{ role.title }}</h3>
            <p class="role-desc">{{ role.desc }}</p>

            <ul class="role-perks" role="list">
              <li v-for="perk in role.perks" :key="perk" class="role-perk" role="listitem">
                <span class="perk-mark" aria-hidden="true" />
                {{ perk }}
              </li>
            </ul>

            <button
              :id="`role-btn-${role.title.toLowerCase()}`"
              class="role-btn"
              @click="goToLogin"
            >
              Masuk sebagai {{ role.title }}
              <ArrowRight :size="15" stroke-width="2.25" />
            </button>
          </article>
        </div>
      </div>
    </section>

    <!-- ═══ CTA BANNER ═══ -->
    <section class="cta-section" aria-labelledby="cta-heading">
      <div class="container">
        <div class="cta-box">
          <div class="cta-content">
            <h2 id="cta-heading" class="cta-title">
              Siap Memulai<br /><span class="accent-text">Ujian Digital?</span>
            </h2>
            <p class="cta-desc">
              Masuk ke sistem sekarang dan rasakan kemudahan ujian berbasis komputer yang modern dan
              terpercaya.
            </p>
            <button id="cta-main-btn" class="btn-primary btn-lg" @click="goToLogin">
              <LogIn :size="18" stroke-width="2" />
              Masuk ke Sistem
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ FOOTER ═══ -->
    <footer class="footer" role="contentinfo">
      <div class="container footer-inner">
        <div class="footer-brand">
          <div class="brand-icon brand-icon--sm">
            <img src="/ATSLogo -trans.png" alt="CBT ATS" class="brand-img" />
          </div>
          <div>
            <div class="footer-name">CBT ATS</div>
            <div class="footer-sub">Sekolah Tahfidz Al Hikmah</div>
          </div>
        </div>
        <p class="footer-copy">© {{ currentYear }} CBT ATS. Hak cipta dilindungi.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&display=swap');

/* ═══════════════════════════════════════════════
   TOKENS
   ═══════════════════════════════════════════════ */
.landing-root {
  --ink: #14172b;
  --muted: #6b7280;
  --faint: #9aa1b4;
  --bg: #ffffff;
  --bg-alt: #f7f8fb;
  --border: #e6e8f0;
  --accent: #4318ff;
  --accent-soft: rgba(67, 24, 255, 0.06);
  --accent-soft-2: rgba(67, 24, 255, 0.12);
  --mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', monospace;

  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: 'DM Sans', system-ui, sans-serif;
  overflow-x: hidden;
  position: relative;
}

/* ═══════════════════════════════════════════════
   CONTAINER
   ═══════════════════════════════════════════════ */
.container {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 1.5rem;
  position: relative;
  z-index: 1;
}

/* ═══════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════ */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  transition: all 0.25s ease;
  padding: 1.1rem 0;
  border-bottom: 1px solid transparent;
}

.navbar--scrolled {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 0;
}

.nav-inner {
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  flex-shrink: 0;
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--accent-soft);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 5px;
  flex-shrink: 0;
}

.brand-icon--sm {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.brand-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand-name {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.brand-sub {
  font-family: var(--mono);
  font-size: 0.6rem;
  color: var(--faint);
  font-weight: 500;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  list-style: none;
  margin: 0 0 0 auto;
  padding: 0;
}

.nav-link {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--muted);
  text-decoration: none;
  border-radius: 6px;
  transition: color 0.2s;
}

.nav-link:hover,
.nav-link.is-active {
  color: var(--accent);
}

.nav-cta {
  flex-shrink: 0;
}

/* Buttons — flat, single accent, no gradients */
.btn-primary-sm {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.05rem;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
}

.btn-primary-sm:hover {
  background: #370fe0;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.78rem 1.9rem;
  background: var(--accent);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 0.93rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.2s,
    transform 0.2s;
}

.btn-primary:hover {
  background: #370fe0;
  transform: translateY(-1px);
}
.btn-primary:active {
  transform: translateY(0);
}
.btn-lg {
  padding: 0.9rem 2.3rem;
  font-size: 0.98rem;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.78rem 1.9rem;
  background: transparent;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  color: var(--ink);
  font-size: 0.93rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.2s,
    transform 0.2s;
}

.btn-outline:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.hamburger {
  display: none;
  padding: 6px;
  background: none;
  border: 1.5px solid var(--border);
  border-radius: 7px;
  cursor: pointer;
  margin-left: auto;
  align-items: center;
  justify-content: center;
}

.mobile-menu {
  display: none;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
  background: var(--bg);
  border-top: 1px solid var(--border);
}

.mobile-menu.is-open {
  max-height: 320px;
  padding: 0.75rem 1.5rem 1.5rem;
}

.mobile-menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.mobile-link {
  display: block;
  padding: 0.6rem 0.75rem;
  color: var(--ink);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 6px;
}

.mobile-link:hover {
  color: var(--accent);
}

.btn-primary-full {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.78rem;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* ═══════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════ */
.hero-section {
  min-height: 92vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-top: 88px;
  padding-bottom: 4rem;
  text-align: center;
  position: relative;
}

.hero-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.6rem;
  max-width: 760px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.95rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 100px;
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--muted);
}

.badge-dot {
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
  flex-shrink: 0;
}

.hero-title {
  font-size: clamp(2.2rem, 6vw, 4.2rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--ink);
}

.accent-text {
  color: var(--accent);
}

.hero-desc {
  font-size: 1.02rem;
  line-height: 1.75;
  color: var(--muted);
  max-width: 560px;
}

.hero-desc strong {
  color: var(--ink);
  font-weight: 700;
}

.hero-ctas {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  justify-content: center;
}

.trust-strip {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: 0.75rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--faint);
  flex-wrap: wrap;
  justify-content: center;
}

.trust-sep {
  color: var(--border);
}

.scroll-hint {
  position: absolute;
  bottom: 1.75rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  color: var(--border);
  text-decoration: none;
}

.scroll-mouse {
  width: 20px;
  height: 32px;
  border: 1.5px solid var(--border);
  border-radius: 100px;
  display: flex;
  justify-content: center;
  padding-top: 5px;
}

.scroll-wheel {
  width: 2.5px;
  height: 6px;
  background: var(--faint);
  border-radius: 100px;
  animation: wheelMove 1.6s ease-in-out infinite;
}

@keyframes wheelMove {
  0%,
  100% {
    opacity: 1;
    transform: translateY(0);
  }
  50% {
    opacity: 0;
    transform: translateY(6px);
  }
}

/* ═══════════════════════════════════════════════
   STATS BAR
   ═══════════════════════════════════════════════ */
.stats-bar {
  position: relative;
  z-index: 1;
  padding: 2rem 0;
  background: var(--bg-alt);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.stats-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 3rem;
}

.stat-num {
  font-family: var(--mono);
  font-size: 1.7rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1;
}

.stat-label {
  font-size: 0.7rem;
  color: var(--faint);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-sep {
  width: 1px;
  height: 38px;
  background: var(--border);
}

/* ═══════════════════════════════════════════════
   SECTIONS
   ═══════════════════════════════════════════════ */
.section {
  padding: 5.5rem 0;
  position: relative;
  z-index: 1;
}

.section-alt {
  background: var(--bg-alt);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.section-header {
  text-align: center;
  margin-bottom: 3.25rem;
}

.section-tag {
  display: inline-block;
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.9rem;
}

.section-title {
  font-size: clamp(1.6rem, 3.6vw, 2.6rem);
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 0.9rem;
}

.section-desc {
  font-size: 0.95rem;
  color: var(--muted);
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.7;
}

/* ═══════════════════════════════════════════════
   FEATURES — flat cards, single accent, mono index
   ═══════════════════════════════════════════════ */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
}

.feat-card {
  padding: 1.75rem;
  background: var(--bg);
  transition: background 0.2s ease;
}

.feat-card:hover {
  background: var(--bg-alt);
}

.feat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.feat-tag {
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--faint);
}

.feat-icon {
  color: var(--accent);
}

.feat-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 0.5rem;
}

.feat-desc {
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.7;
}

/* ═══════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════ */
.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem;
  position: relative;
}

.steps-connector {
  position: absolute;
  top: 34px;
  left: calc(16.67% + 2rem);
  right: calc(16.67% + 2rem);
  height: 1px;
  background: var(--border);
  z-index: 0;
}

.step-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  position: relative;
  z-index: 1;
}

.step-icon-wrap {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--bg);
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-icon {
  color: var(--accent);
}

.step-num {
  position: absolute;
  top: -8px;
  right: -10px;
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--faint);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 0.1rem 0.4rem;
}

.step-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--ink);
}

.step-desc {
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.65;
  max-width: 240px;
}

/* ═══════════════════════════════════════════════
   ROLES
   ═══════════════════════════════════════════════ */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

.role-card {
  padding: 1.75rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.2s ease;
}

.role-card:hover {
  border-color: var(--accent);
}

.role-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.role-icon {
  color: var(--accent);
}

.role-code {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--faint);
  letter-spacing: 0.03em;
}

.role-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 0.6rem;
}

.role-desc {
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.7;
  margin-bottom: 1.1rem;
}

.role-perks {
  list-style: none;
  margin: 0 0 1.5rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.role-perk {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.83rem;
  color: var(--ink);
  font-weight: 500;
}

.perk-mark {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.role-btn {
  width: 100%;
  padding: 0.7rem 1.1rem;
  background: transparent;
  border: 1.5px solid var(--border);
  border-radius: 9px;
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.role-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

/* ═══════════════════════════════════════════════
   CTA
   ═══════════════════════════════════════════════ */
.cta-section {
  padding: 5rem 0;
  position: relative;
  z-index: 1;
}

.cta-box {
  padding: 3.5rem 3rem;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 16px;
  text-align: center;
}

.cta-title {
  font-size: clamp(1.7rem, 3.4vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 0.9rem;
  line-height: 1.15;
}

.cta-desc {
  font-size: 0.95rem;
  color: var(--muted);
  max-width: 460px;
  margin: 0 auto 2rem;
  line-height: 1.7;
}

/* ═══════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════ */
.footer {
  position: relative;
  z-index: 1;
  border-top: 1px solid var(--border);
  padding: 1.75rem 0;
  background: var(--bg);
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.footer-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--ink);
}
.footer-sub {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--faint);
}
.footer-copy {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--faint);
}

/* ═══════════════════════════════════════════════
   ANIMATIONS — minimal, no orb drift / floating cards
   ═══════════════════════════════════════════════ */
.animate-fade-up {
  opacity: 0;
  transform: translateY(16px);
  animation: fadeUp 0.55s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.delay-1 {
  animation-delay: 0.08s;
}
.delay-2 {
  animation-delay: 0.16s;
}
.delay-3 {
  animation-delay: 0.24s;
}
.delay-4 {
  animation-delay: 0.32s;
}

@keyframes fadeUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.reveal {
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

.delay-1.reveal {
  transition-delay: 0.05s;
}
.delay-2.reveal {
  transition-delay: 0.12s;
}
.delay-3.reveal {
  transition-delay: 0.19s;
}

@media (prefers-reduced-motion: reduce) {
  .animate-fade-up,
  .reveal,
  .scroll-wheel {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}

/* ═══════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .roles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .steps-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
  .steps-connector {
    display: none;
  }
  .stat-item {
    padding: 0.5rem 1.75rem;
  }
}

@media (max-width: 768px) {
  .nav-links,
  .nav-cta {
    display: none;
  }
  .hamburger {
    display: flex;
  }
  .mobile-menu {
    display: block;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
  .roles-grid {
    grid-template-columns: 1fr;
  }
  .section {
    padding: 4rem 0;
  }
  .cta-box {
    padding: 2.5rem 1.5rem;
  }
  .stats-grid {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .hero-ctas {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-primary,
  .btn-outline {
    justify-content: center;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0;
  }
  .stat-sep {
    display: none;
  }
  .stat-item {
    padding: 0.75rem 1rem;
  }
  .footer-inner {
    flex-direction: column;
    text-align: center;
  }
}
</style>
