<script setup lang="ts">
import { ref } from 'vue'
import { useSimulation } from './composables/useSimulation'
import ControlPanel from './components/ControlPanel.vue'
import TaskPanel from './components/TaskPanel.vue'
import OccupancyPanel from './components/OccupancyPanel.vue'
import LogPanel from './components/LogPanel.vue'

const container = ref<HTMLElement | null>(null)
const { sim, snap } = useSimulation(container)
</script>

<template>
  <div class="app">
    <div ref="container" class="viewport">
      <div class="hud-top">
        <div class="hud-title">
          <span class="logo">🏭</span>
          自动化立体仓库 3D 仿真系统
        </div>
        <div v-if="snap" class="hud-state" :class="{ paused: snap.paused }">
          <span class="hud-dot" />
          {{ snap.paused ? '仿真已暂停' : '运行中' }}
        </div>
      </div>
      <div class="hud-hint">
        🖱 左键旋转视角 · 右键平移 · 滚轮缩放 · 点击货架货位查看占用情况
      </div>
    </div>

    <aside class="sidebar">
      <template v-if="snap">
        <ControlPanel :sim="sim" :snap="snap" />
        <TaskPanel :snap="snap" />
        <OccupancyPanel :snap="snap" />
        <LogPanel :snap="snap" />
      </template>
    </aside>
  </div>
</template>
