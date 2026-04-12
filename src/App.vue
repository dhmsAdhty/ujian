<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="fade-up" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
.fade-up-enter-active,
.fade-up-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
