<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-vue-next'
import { PrimaryButton } from '@/components/ui'
import { useRouter } from 'vue-router'

const props = defineProps({
  steps: {
    type: Array,
    required: true,
    // Step: { target: '#id', title: '', content: '', route: '/path' }
  },
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'complete'])

const router = useRouter()
const currentStepIndex = ref(0)
const spotlightStyle = ref({})
const tooltipStyle = ref({})
const tooltipAlign = ref('bottom-center') // 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right'

const updateSpotlight = async () => {
  const step = props.steps[currentStepIndex.value]
  if (!step) return

  // Auto-navigate if step has a route defined and we are not currently there
  if (step.route && router && router.currentRoute.value.path !== step.route) {
    try {
      await router.push(step.route)
      // Allow DOM to mount the components of the new view
      await new Promise(resolve => setTimeout(resolve, 600))
    } catch (err) {
      console.error('Failed to navigate tour route:', err)
    }
  }

  if (!step.target) return

  const targetEl = document.querySelector(step.target)
  if (!targetEl) {
    // If target not found, try to wait a tiny bit longer and query again
    setTimeout(() => {
      const retryEl = document.querySelector(step.target)
      if (retryEl) {
        applySpotlightOnElement(retryEl)
      } else {
        console.warn(`Tour target ${step.target} not found after retry`)
      }
    }, 400)
    return
  }

  applySpotlightOnElement(targetEl)
}

const applySpotlightOnElement = (targetEl) => {
  const rect = targetEl.getBoundingClientRect()
  const padding = 8
  const TOOLTIP_W = 300
  const TOOLTIP_H = 220
  const GAP = 12

  // Spotlight position
  spotlightStyle.value = {
    top: `${rect.top - padding}px`,
    left: `${rect.left - padding}px`,
    width: `${rect.width + padding * 2}px`,
    height: `${rect.height + padding * 2}px`,
    boxShadow: `0 0 0 9999px rgba(15, 23, 42, 0.75)`
  }

  const windowHeight = window.innerHeight
  const windowWidth = window.innerWidth

  // Determine vertical position: prefer below, fall back to above
  const spaceBelow = windowHeight - rect.bottom
  const spaceAbove = rect.top
  const showAbove = spaceBelow < TOOLTIP_H + GAP && spaceAbove > TOOLTIP_H + GAP
  const tTop = showAbove
    ? rect.top - GAP - TOOLTIP_H
    : rect.bottom + GAP

  // Determine horizontal alignment
  // Center of the target element
  const centerX = rect.left + rect.width / 2
  // Tooltip half-width = 150px
  const halfW = TOOLTIP_W / 2

  let tLeft, transform, align

  if (centerX + halfW > windowWidth - 16) {
    // Too close to the right edge → align tooltip to the right of the element
    tLeft = Math.min(rect.right, windowWidth - 16)
    transform = 'translateX(-100%)'
    align = showAbove ? 'top-right' : 'bottom-right'
  } else if (centerX - halfW < 16) {
    // Too close to left edge → align left
    tLeft = Math.max(rect.left, 16)
    transform = 'translateX(0)'
    align = showAbove ? 'top-left' : 'bottom-left'
  } else {
    // Normal center alignment
    tLeft = centerX
    transform = 'translateX(-50%)'
    align = showAbove ? 'top-center' : 'bottom-center'
  }

  tooltipAlign.value = align

  tooltipStyle.value = {
    top: `${tTop}px`,
    left: `${tLeft}px`,
    transform,
  }

  // Scroll into view if needed
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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

        <!-- Arrow indicator — adapts to tooltip direction -->
        <div
          class="absolute w-4 h-4 bg-white rotate-45 border-venus-100"
          :class="{
            '-top-2 border-l border-t': tooltipAlign.includes('bottom'),
            '-bottom-2 border-r border-b': tooltipAlign.includes('top'),
            'left-1/2 -translate-x-1/2': tooltipAlign.includes('center'),
            'right-4': tooltipAlign.includes('right'),
            'left-4': tooltipAlign.includes('left'),
          }"
        ></div>
      </div>
    </div>
  </Teleport>
</template>
