<script setup>
defineProps({
  hover: {
    type: Boolean,
    default: true
  },
  padding: {
    type: String,
    default: 'p-6'
  }
})
</script>

<template>
  <div
    class="glass-card overflow-hidden transition-[box-shadow,border-color] duration-200"
    :class="[
      padding,
      hover ? 'hover:border-zinc-300 hover:shadow-md' : ''
    ]"
  >
    <slot />
  </div>
</template>
