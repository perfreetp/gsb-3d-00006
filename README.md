# 3D 自动化立体仓库仿真系统

基于 Vue 3 + TypeScript + Vite + Three.js 的自动化立体仓库（AS/RS）仿真系统。

## 功能

- **3D 场景**：双侧 12 列 × 5 层货架、托盘货物、双柱堆垛机、入库/出库双输送线、出入库口标识
- **任务调度**：随机生成入库/出库任务，FIFO 队列，堆垛机空闲自动领取执行
- **真实状态逻辑**：堆垛机行走(X)/升降(Y)/货叉伸缩(Z) 均由状态机 + 速度积分驱动，输送线托盘带防碰撞排队，非固定动画
- **交互**：
  - 点击货位色块查看占用详情（绿色=空闲，橙色=占用，青色=选中）
  - 暂停 / 继续仿真
  - 0.5x / 1x / 2x / 4x 运行速度调节
  - 鼠标拖拽旋转视角、滚轮缩放
- **状态展示**：当前任务、任务队列、堆垛机状态与坐标、货位占用率、出入库完成统计

## 运行

```bash
npm install
npm run dev      # 开发模式
npm run build    # 生产构建
npm run preview  # 预览构建产物
```

## 代码结构

```
src/
  sim/
    config.ts       # 仓库布局与设备速度参数
    types.ts        # 货位/托盘/任务/堆垛机步骤类型
    simulation.ts   # 仿真核心：任务调度、堆垛机状态机、输送线逻辑
  three/
    scene.ts        # Three.js 场景构建与状态同步渲染
  components/
    ControlPanel.vue  # 运行控制（暂停/速度/状态）
    TaskPanel.vue     # 任务队列
    SlotPanel.vue     # 货位占用详情
  App.vue
```
