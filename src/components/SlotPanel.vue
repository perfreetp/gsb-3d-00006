<script setup lang="ts">
import { ui } from '../sim/simulation'
import { sim } from '../sim/simulation'

function close() {
  sim.selectSlot(null)
}
</script>

<template>
  <div class="panel slot-panel" :class="{ visible: ui.selected }">
    <template v-if="ui.selected">
      <div class="header">
        <h3>货位详情</h3>
        <button class="close" @click="close">✕</button>
      </div>
      <div class="coord">
        {{ ui.selected.coord.side === 0 ? 'A 侧（左）' : 'B 侧（右）' }}
        · 第 {{ ui.selected.coord.column + 1 }} 列 · 第 {{ ui.selected.coord.level + 1 }} 层
      </div>
      <div v-if="ui.selected.pallet" class="occupied">
        <div class="badge full">已占用</div>
        <div class="info-line"><span>托盘编号</span><b>#{{ ui.selected.pallet.id }}</b></div>
        <div class="info-line"><span>货物名称</span><b>{{ ui.selected.pallet.goods }}</b></div>
        <div class="info-line">
          <span>货物颜色</span>
          <i class="swatch" :style="{ background: '#' + ui.selected.pallet.color.toString(16).padStart(6, '0') }"></i>
        </div>
      </div>
      <div v-else class="occupied">
        <div class="badge empty">空闲</div>
        <div class="hint">该货位可用于入库任务分配</div>
      </div>
    </template>
    <div v-else class="tip">💡 点击货架上的货位色块查看占用情况<br>绿色 = 空闲 · 橙色 = 占用</div>
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
.slot-panel { width: 250px; }
.slot-panel.visible { border-color: #00e5ff; }
.header { display: flex; justify-content: space-between; align-items: center; }
h3 { margin: 0; font-size: 14px; color: #00e5ff; letter-spacing: 1px; }
.close {
  background: none; border: none; color: #8fa1b8; cursor: pointer; font-size: 14px;
}
.close:hover { color: #fff; }
.coord { margin: 8px 0; font-size: 13px; color: #e8eef6; font-weight: 600; }
.badge {
  display: inline-block; padding: 2px 10px; border-radius: 4px;
  font-size: 12px; margin-bottom: 8px;
}
.badge.full { background: #5c3a1e; color: #ffb35c; }
.badge.empty { background: #1e5c38; color: #7dffb0; }
.info-line {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; margin: 5px 0; color: #8fa1b8;
}
.info-line b { color: #e8eef6; }
.swatch { width: 16px; height: 16px; border-radius: 3px; display: inline-block; }
.hint { font-size: 12px; color: #6b7c93; }
.tip { font-size: 12px; color: #6b7c93; line-height: 1.7; }
</style>
