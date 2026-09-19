<script setup lang="ts">
import type { SimSnapshot } from '../types'

defineProps<{ snap: SimSnapshot }>()

function fmt(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
</script>

<template>
  <div class="panel log-panel">
    <div class="panel-title">运行日志</div>
    <div class="logs">
      <div v-for="(l, i) in snap.logs" :key="i" class="log-item" :class="l.kind">
        <span class="log-time">{{ fmt(l.time) }}</span>
        <span class="log-text">{{ l.text }}</span>
      </div>
    </div>
  </div>
</template>
