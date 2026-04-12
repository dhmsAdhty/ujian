<script setup>
defineProps({
  hover: {
    type: Boolean,
    default: false
  },
  padding: {
    type: String,
    default: 'p-6'
  }
})
</script>

<template>
  <div
    class="glass-card overflow-hidden transition-[box-shadow,border-color] duration-250 ease-ios"
    :class="[
      padding,
      hover ? 'hover:border-venus-300/90 hover:shadow-ios-md' : ''
    ]"
  >
    <slot />
  </div>
</template>
