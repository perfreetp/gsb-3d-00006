<script setup lang="ts">
import { computed } from 'vue'
import type { SimSnapshot } from '../types'
import { CONFIG } from '../sim/config'

const props = defineProps<{ snap: SimSnapshot }>()

const levels = computed(() => {
  const rows: { label: string; a: boolean[]; b: boolean[] }[] = []
  for (let i = 0; i < CONFIG.LEVELS; i++) {
    const displayLv = CONFIG.LEVELS - 1 - i
    rows.push({
      label: `${displayLv + 1}层`,
      a: props.snap.occupancy[0].slice(displayLv * CONFIG.COLS, displayLv * CONFIG.COLS + CONFIG.COLS),
      b: props.snap.occupancy[1].slice(displayLv * CONFIG.COLS, displayLv * CONFIG.COLS + CONFIG.COLS)
    })
  }
  return rows
})
</script>

<template>
  <div class="panel">
    <div class="panel-title">货位占用图</div>
    <div class="legend">
      <span><i class="sq filled" /> 已占用</span>
      <span><i class="sq empty" /> 空货位</span>
      <span class="tip">点击 3D 货架可查看货位明细</span>
    </div>

    <div v-if="snap.selected" class="cell-detail" :class="{ occupied: snap.selected.occupied }">
      <template v-if="snap.selected.occupied && snap.selected.cargo">
        <b>{{ snap.selected.key.side }}区 · {{ snap.selected.key.level + 1 }}层 · {{ snap.selected.key.col + 1 }}列</b>
        <span class="cargo-line" :style="{ color: `#${snap.selected.cargo.color.toString(16).padStart(6, '0')}` }">
          ● {{ snap.selected.cargo.name }}（{{ snap.selected.cargo.id }}）
        </span>
      </template>
      <template v-else>
        <b>{{ snap.selected.key.side }}区 · {{ snap.selected.key.level + 1 }}层 · {{ snap.selected.key.col + 1 }}列</b>
        <span class="muted">空货位，可安排入库</span>
      </template>
    </div>

    <div class="rack-map">
      <div class="map-side-label">B 区</div>
      <div v-for="(row, i) in levels" :key="'b' + i" class="map-row">
        <span class="row-label">{{ row.label }}</span>
        <span v-for="(v, ci) in row.b" :key="ci" class="cell" :class="{ filled: v }" />
      </div>
      <div class="map-divider" />
      <div class="map-side-label a">A 区</div>
      <div v-for="(row, i) in levels" :key="'a' + i" class="map-row">
        <span class="row-label">{{ row.label }}</span>
        <span v-for="(v, ci) in row.a" :key="ci" class="cell" :class="{ filled: v }" />
      </div>
    </div>
  </div>
</template>
