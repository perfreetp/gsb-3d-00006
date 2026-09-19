<script setup lang="ts">
import { ui } from '../sim/simulation'
import type { SlotCoord } from '../sim/types'

function slotText(s: SlotCoord) {
  return `${s.side === 0 ? 'A' : 'B'}侧-${s.column + 1}列-${s.level + 1}层`
}
</script>

<template>
  <div class="panel task-panel">
    <h3>任务队列（{{ ui.tasks.length }}）</h3>
    <div v-if="!ui.tasks.length" class="empty">暂无任务，等待生成…</div>
    <transition-group v-else name="list" tag="div" class="task-list">
      <div
        v-for="t in ui.tasks" :key="t.id"
        class="task" :class="[t.type, { active: t.state === 'active' }]"
      >
        <span class="tag">{{ t.type === 'inbound' ? '入库' : '出库' }}</span>
        <span class="desc">#{{ t.id }} 托盘{{ t.palletId }} → {{ slotText(t.slot) }}</span>
        <span class="st">{{ t.state === 'active' ? '执行中' : '排队中' }}</span>
      </div>
    </transition-group>
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
.task-panel { width: 320px; max-height: 46vh; display: flex; flex-direction: column; }
h3 { margin: 0 0 10px; font-size: 14px; color: #7fb3ff; letter-spacing: 1px; }
.empty { color: #6b7c93; font-size: 12px; padding: 8px 0; }
.task-list { overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.task {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 6px; font-size: 12px;
  background: #1c2635; border: 1px solid #2c3a4f;
}
.task.active { border-color: #ffd166; background: #2a2c1c; }
.tag { padding: 1px 6px; border-radius: 4px; font-size: 11px; flex-shrink: 0; }
.inbound .tag { background: #1e5c38; color: #7dffb0; }
.outbound .tag { background: #5c2a1e; color: #ffab7d; }
.desc { flex: 1; color: #c4d0e0; }
.st { color: #8fa1b8; font-size: 11px; flex-shrink: 0; }
.task.active .st { color: #ffd166; }
.list-enter-active, .list-leave-active { transition: all 0.3s; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(20px); }
</style>
