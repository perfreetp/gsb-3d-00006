<script setup lang="ts">
import type { Simulation } from '../sim/simulation'
import type { SimSnapshot } from '../types'
import StatChip from './StatChip.vue'

defineProps<{ sim: Simulation | null; snap: SimSnapshot }>()

const speeds = [0.25, 0.5, 1, 2, 4]

function fmtTime(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
</script>

<template>
  <div class="panel">
    <div class="panel-title">运行控制</div>
    <div class="row">
      <button class="btn primary" @click="sim?.togglePause()">
        {{ snap.paused ? '▶ 继续仿真' : '⏸ 暂停仿真' }}
      </button>
      <button class="btn" @click="sim?.resetView()">复位视角</button>
    </div>

    <div class="speed-block">
      <div class="block-label">运行速度：<b>{{ snap.speed }}×</b></div>
      <div class="speed-row">
        <button
          v-for="v in speeds"
          :key="v"
          class="btn speed"
          :class="{ active: snap.speed === v }"
          @click="sim?.setSpeed(v)"
        >{{ v }}×</button>
      </div>
      <input
        class="range"
        type="range"
        min="0.25"
        max="6"
        step="0.25"
        :value="snap.speed"
        @input="sim?.setSpeed(Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <div class="row">
      <button class="btn green" @click="sim?.addInbound()">＋ 下发入库</button>
      <button class="btn red" @click="sim?.addOutbound()">＋ 下发出库</button>
    </div>

    <div class="stats-grid">
      <StatChip label="仿真时间" :value="fmtTime(snap.simTime)" />
      <StatChip label="已完成任务" :value="snap.completedCount" />
      <StatChip label="入库" :value="snap.inboundCount" tone="green" />
      <StatChip label="出库" :value="snap.outboundCount" tone="red" />
      <StatChip label="货位占用" :value="`${snap.occupiedCount}/${snap.totalCells}`" />
      <StatChip label="利用率" :value="`${(snap.stats.utilization * 100).toFixed(1)}%`" tone="blue" />
      <StatChip label="行走次数" :value="snap.stats.moves" />
      <StatChip label="取/放次数" :value="`${snap.stats.picks}/${snap.stats.drops}`" />
    </div>
  </div>
</template>
