<script setup>
defineProps({
  modelValue: [String, Number],
  label: String,
  type: {
    type: String,
    default: 'text'
  },
  placeholder: String,
  icon: [Object, Function], // Lucide icon component
  error: String
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="space-y-2 w-full">
    <label v-if="label" class="ml-0.5 block text-sm font-medium text-venus-700">{{ label }}</label>
    <div class="relative group">
      <div v-if="icon" class="absolute left-3.5 top-1/2 -tranvenus-y-1/2 text-venus-400 transition-colors group-focus-within:text-primary-600">
        <component :is="icon" :size="20" />
      </div>
      <input 
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        :type="type" 
        :placeholder="placeholder"
        class="form-input"
        :class="[
          icon ? 'pl-11' : '',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
        ]"
      />
    </div>
    <p v-if="error" class="ml-0.5 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
