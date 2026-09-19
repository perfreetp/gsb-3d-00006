<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { sim } from './sim/simulation'
import { createScene } from './three/scene'
import ControlPanel from './components/ControlPanel.vue'
import TaskPanel from './components/TaskPanel.vue'
import SlotPanel from './components/SlotPanel.vue'

const viewport = ref<HTMLElement>()

onMounted(() => {
  createScene(viewport.value!, sim)
})
</script>

<template>
  <div class="app">
    <div ref="viewport" class="viewport"></div>
    <div class="title-bar">
      <h1>3D 自动化立体仓库仿真系统</h1>
      <span class="sub">AS/RS Simulation · Vue3 + Three.js</span>
    </div>
    <div class="left-panels">
      <ControlPanel />
      <SlotPanel />
    </div>
    <div class="right-panels">
      <TaskPanel />
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; overflow: hidden; }
body { font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif; }
.app { position: relative; width: 100%; height: 100%; }
.viewport { position: absolute; inset: 0; }
.title-bar {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  text-align: center; pointer-events: none;
}
.title-bar h1 {
  font-size: 20px; color: #e8eef6; letter-spacing: 2px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}
.title-bar .sub { font-size: 11px; color: #7fb3ff; letter-spacing: 1px; }
.left-panels {
  position: absolute; top: 14px; left: 14px;
  display: flex; flex-direction: column; gap: 12px;
}
.right-panels {
  position: absolute; top: 14px; right: 14px;
  display: flex; flex-direction: column; gap: 12px;
}
</style>
