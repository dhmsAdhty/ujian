<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-vue-next'
import { PrimaryButton } from '@/components/ui'

const props = defineProps({
  steps: {
    type: Array,
    required: true,
    // Step: { target: '#id', title: '', content: '' }
  },
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'complete'])

const currentStepIndex = ref(0)
const spotlightStyle = ref({})
const tooltipStyle = ref({})

const updateSpotlight = () => {
  const step = props.steps[currentStepIndex.value]
  if (!step || !step.target) return

  const targetEl = document.querySelector(step.target)
  if (!targetEl) {
    // If target not found, move to next or skip
    console.warn(`Tour target ${step.target} not found`)
    return
  }

  const rect = targetEl.getBoundingClientRect()
  const padding = 8

  // Spotlight position
  spotlightStyle.value = {
    top: `${rect.top - padding}px`,
    left: `${rect.left - padding}px`,
    width: `${rect.width + padding * 2}px`,
    height: `${rect.height + padding * 2}px`,
    boxShadow: `0 0 0 9999px rgba(15, 23, 42, 0.75)` // Tailwind slate-900 with opacity
  }

  // Tooltip position
  // Default: bottom center
  let tTop = rect.bottom + padding + 12
  let tLeft = rect.left + rect.width / 2

  // Adjustment if too close to bottom or right
  const windowHeight = window.innerHeight
  const windowWidth = window.innerWidth

  if (tTop + 200 > windowHeight) {
    tTop = rect.top - padding - 180 // Show above
  }
  
  if (tLeft + 150 > windowWidth) {
    tLeft = windowWidth - 170
  } else if (tLeft - 150 < 0) {
    tLeft = 170
  }

  tooltipStyle.value = {
    top: `${tTop}px`,
    left: `${tLeft}px`,
    transform: 'translateX(-50%)'
  }

  // Scroll into view if needed
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const nextStep = () => {
  if (currentStepIndex.value < props.steps.length - 1) {
    currentStepIndex.value++
    updateSpotlight()
  } else {
    finishTour()
  }
}

const prevStep = () => {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
    updateSpotlight()
  }
}

const finishTour = () => {
  emit('update:modelValue', false)
  emit('complete')
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    currentStepIndex.value = 0
    setTimeout(updateSpotlight, 100)
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// Update on resize/scroll
onMounted(() => {
  window.addEventListener('resize', updateSpotlight)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateSpotlight)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[110] overflow-hidden pointer-events-none">
      <!-- The Spotlight (Cut-out) -->
      <div 
        class="absolute rounded-xl transition-all duration-300 ease-ios pointer-events-auto"
        :style="spotlightStyle"
      ></div>

      <!-- Tooltip Card -->
      <div 
        class="absolute w-[300px] bg-white rounded-2xl shadow-2xl p-5 pointer-events-auto transition-all duration-300 ease-ios border border-venus-100"
        :style="tooltipStyle"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-primary-50 text-primary-600 rounded-lg">
            <Sparkles :size="16" />
          </div>
          <span class="text-xs font-bold text-primary-600 uppercase tracking-widest">Tutorial · {{ currentStepIndex + 1 }}/{{ steps.length }}</span>
        </div>
        
        <h3 class="text-base font-bold text-venus-900 mb-1.5">{{ steps[currentStepIndex].title }}</h3>
        <p class="text-sm text-venus-500 leading-relaxed mb-6">{{ steps[currentStepIndex].content }}</p>

        <div class="flex items-center justify-between">
          <div class="flex gap-1.5">
            <button 
              v-if="currentStepIndex > 0"
              @click="prevStep"
              class="p-2 rounded-xl bg-venus-50 text-venus-500 hover:bg-venus-100 transition-colors"
            >
              <ChevronLeft :size="18" />
            </button>
            <button 
              @click="finishTour"
              class="px-3 text-xs font-semibold text-venus-400 hover:text-red-500 transition-colors"
            >
              Lewati
            </button>
          </div>
          
          <PrimaryButton class="py-2.5 px-5" @click="nextStep">
            {{ currentStepIndex === steps.length - 1 ? 'Selesai' : 'Lanjut' }}
            <ChevronRight v-if="currentStepIndex < steps.length - 1" :size="16" class="ml-1" />
          </PrimaryButton>
        </div>

        <!-- Arrow indicator (optional, simplified) -->
        <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-l border-t border-venus-100"></div>
      </div>
    </div>
  </Teleport>
</template>
