<script setup lang="ts">
import { ui } from '../sim/simulation'

const speeds = [0.5, 1, 2, 4]

function reset() {
  location.reload()
}
</script>

<template>
  <div class="panel control-panel">
    <h3>运行控制</h3>
    <div class="row">
      <button class="btn" :class="ui.paused ? 'go' : 'pause'" @click="ui.paused = !ui.paused">
        {{ ui.paused ? '▶ 继续' : '⏸ 暂停' }}
      </button>
      <button class="btn reset" @click="reset">↺ 重置</button>
    </div>
    <div class="row speed-row">
      <span class="label">速度</span>
      <button
        v-for="s in speeds" :key="s"
        class="btn speed" :class="{ active: ui.speed === s }"
        @click="ui.speed = s"
      >{{ s }}x</button>
    </div>
    <div class="status">
      <div class="status-line">
        <span class="label">堆垛机</span>
        <span class="value state">{{ ui.craneState }}</span>
      </div>
      <div class="status-line">
        <span class="label">位置</span>
        <span class="value">X {{ ui.cranePos.x.toFixed(2) }}m / Y {{ ui.cranePos.y.toFixed(2) }}m</span>
      </div>
      <div class="status-line">
        <span class="label">货位占用</span>
        <span class="value">{{ ui.occupancy }} / {{ ui.totalSlots }}
          ({{ ((ui.occupancy / ui.totalSlots) * 100).toFixed(0) }}%)</span>
      </div>
      <div class="status-line">
        <span class="label">已完成</span>
        <span class="value">入库 {{ ui.stats.inboundDone }} · 出库 {{ ui.stats.outboundDone }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: rgba(16, 22, 32, 0.88);
  border: 1px solid #2c3a4f;
  border-radius: 10px;
  padding: 12px 14px;
  color: #d7e0ec;
  backdrop-filter: blur(6px);
}
.control-panel { width: 250px; }
h3 { margin: 0 0 10px; font-size: 14px; color: #7fb3ff; letter-spacing: 1px; }
.row { display: flex; gap: 8px; margin-bottom: 8px; }
.btn {
  flex: 1; padding: 7px 10px; border: 1px solid #3a4a63; border-radius: 6px;
  background: #1c2635; color: #d7e0ec; cursor: pointer; font-size: 13px;
  transition: all 0.15s;
}
.btn:hover { background: #27344a; }
.btn.pause { background: #b3541e; border-color: #d0691e; }
.btn.go { background: #1e7e46; border-color: #27ae60; }
.btn.reset { flex: 0.6; }
.btn.speed { flex: 1; padding: 5px 0; }
.btn.speed.active { background: #2166ac; border-color: #4393d4; color: #fff; }
.speed-row { align-items: center; }
.label { color: #8fa1b8; font-size: 12px; }
.status { border-top: 1px solid #2c3a4f; padding-top: 8px; margin-top: 4px; }
.status-line { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
.value { color: #e8eef6; }
.value.state { color: #ffd166; }
</style>
