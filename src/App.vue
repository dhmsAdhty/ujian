<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="fade-up">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
.fade-up-enter-active,
.fade-up-leave-active {
  transition:
    opacity 0.32s cubic-bezier(0.25, 0.1, 0.25, 1),
    transform 0.32s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .fade-up-enter-active,
  .fade-up-leave-active {
    transition-duration: 0.01ms;
  }

  .fade-up-enter-from,
  .fade-up-leave-to {
    transform: none;
  }
}
</style>
