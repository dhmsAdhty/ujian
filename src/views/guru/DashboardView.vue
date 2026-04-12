<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-slate-900">Dashboard Guru</h1>
      <p class="text-slate-500">Kelola soal dan nilai mata pelajaran Anda.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div v-for="i in 2" :key="i" class="glass-card p-6 h-40 animate-pulse"></div>
    </div>
  </div>
</template>
