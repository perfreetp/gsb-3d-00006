<script setup lang="ts">
import type { SimSnapshot, Task, TaskKind, TaskPhase } from '../types'

defineProps<{ snap: SimSnapshot }>()

const kindText: Record<TaskKind, string> = {
  INBOUND: '入库',
  OUTBOUND: '出库'
}

const phaseText: Record<TaskPhase, string> = {
  QUEUED: '排队等待',
  MOVE_TO_SOURCE: '驶向取货位',
  PICK_SOURCE: '叉取货物',
  MOVE_TO_TARGET: '驶向目标位',
  DROP_TARGET: '放货',
  DONE: '完成'
}

function cellText(t: Task) {
  return `${t.cell.side}区 · ${t.cell.level + 1}层 · ${t.cell.col + 1}列`
}

function statusLine(snap: SimSnapshot) {
  if (snap.paused) return { text: '已暂停', cls: 'paused' }
  const c = snap.current
  if (!c) return { text: '空闲待机', cls: 'idle' }
  return { text: phaseText[c.phase], cls: 'running' }
}
</script>

<template>
  <div class="panel">
    <div class="panel-title">任务与设备状态</div>

    <div class="crane-status" :class="statusLine(snap).cls">
      <div class="status-head">
        <span class="dot" />
        <span>堆垛机：{{ statusLine(snap).text }}</span>
      </div>
      <div v-if="snap.current" class="current-task">
        <div class="ct-row">
          <span class="tag" :class="snap.current.kind">{{ kindText[snap.current.kind] }}任务 #{{ snap.current.id }}</span>
          <span class="phase">{{ phaseText[snap.current.phase] }}</span>
        </div>
        <div class="ct-cargo" :style="{ borderLeftColor: `#${snap.current.color.toString(16).padStart(6, '0')}` }">
          {{ snap.current.cargoName }} → {{ cellText(snap.current) }}
        </div>
      </div>
      <div v-else class="muted">当前无在执行任务</div>

      <div class="motion-grid">
        <div><span>行走位置 Z</span><b>{{ snap.crane.z.toFixed(2) }} m</b></div>
        <div><span>起升高度</span><b>{{ snap.crane.liftY.toFixed(2) }} m</b></div>
        <div><span>货叉伸出</span><b>{{ snap.crane.forkExt.toFixed(2) }} m</b></div>
        <div><span>载货托盘</span><b>{{ snap.crane.loadId ?? '无' }}</b></div>
      </div>
    </div>

    <div class="stations">
      <div class="station" :class="{ on: snap.stations.inboundReady }">
        <span class="station-dot green" />
        <div>
          <div class="station-name">入库口</div>
          <div class="station-cargo">{{ snap.stations.inboundCargo ?? '空' }}</div>
        </div>
      </div>
      <div class="station" :class="{ on: snap.stations.outboundOccupied }">
        <span class="station-dot red" />
        <div>
          <div class="station-name">出库口</div>
          <div class="station-cargo">{{ snap.stations.outboundCargo ?? '空' }}</div>
        </div>
      </div>
    </div>

    <div class="queue-title">待执行队列（{{ snap.queue.length }}）</div>
    <div class="queue">
      <div v-for="t in snap.queue" :key="t.id" class="queue-item">
        <span class="tag" :class="t.kind">{{ kindText[t.kind] }}</span>
        <span class="q-name">#{{ t.id }} {{ t.cargoName }}</span>
        <span class="q-cell">{{ cellText(t) }}</span>
      </div>
      <div v-if="!snap.queue.length" class="muted">暂无排队任务</div>
    </div>
  </div>
</template>
