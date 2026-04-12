<script setup>
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import { ref, provide } from 'vue'
import { GlassCard } from '@/components/ui'

use([
  CanvasRenderer,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

provide(THEME_KEY, 'light')

const option = ref({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b} : {c} ({d}%)'
  },
  legend: {
    orient: 'horizontal',
    bottom: 'bottom',
    textStyle: {
      color: '#707eae'
    }
  },
  color: ['#4318ff', '#868cff', '#6b5eff', '#3814d6', '#d9d2ff'],
  series: [
    {
      name: 'Rasio Soal',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: '18',
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: [
        { value: 1048, name: 'Pilihan Ganda' },
        { value: 735, name: 'Essay' }
      ]
    }
  ]
})
</script>

<template>
  <GlassCard class="flex h-[400px] flex-col">
    <h3 class="mb-5 text-lg font-semibold tracking-tight text-venus-900">Rasio PG vs Essay</h3>
    <div class="flex-1 w-full h-full min-h-[250px]">
      <v-chart class="chart w-full h-full" :option="option" autoresize />
    </div>
  </GlassCard>
</template>

<style scoped>
.chart {
  height: 100%;
  width: 100%;
}
</style>
