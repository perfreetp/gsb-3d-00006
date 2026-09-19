export type Side = 0 | 1 // 0 = 巷道左侧(-Z) 1 = 右侧(+Z)

export interface SlotCoord {
  side: Side
  column: number
  level: number
}

export function slotKey(s: SlotCoord): string {
  return `${s.side}-${s.column}-${s.level}`
}

export type PalletLoc = 'conveyor' | 'crane' | 'slot'

export interface Pallet {
  id: number
  goods: string
  color: number
  loc: PalletLoc
  x: number
  y: number
  z: number
  dir: 'in' | 'out'        // 输送线上的流动方向
  slot: SlotCoord | null
}

export type TaskType = 'inbound' | 'outbound'

export interface Task {
  id: number
  type: TaskType
  palletId: number
  slot: SlotCoord
  state: 'pending' | 'active' | 'done'
}

// 堆垛机作业步骤：由调度器生成，堆垛机按序执行（真实状态逻辑）
export type CraneStep =
  | { kind: 'move'; x: number; y: number }   // 行走+升降联动
  | { kind: 'fork'; z: number }              // 货叉伸缩到指定 Z
  | { kind: 'lift'; dy: number; targetY?: number } // 载货台微升/微降（取放货）
  | { kind: 'attachSlot' }                   // 从货位取货
  | { kind: 'detachSlot' }                   // 向货位放货
  | { kind: 'attachPort' }                   // 从入库口取货
  | { kind: 'detachPort' }                   // 向出库口放货
  | { kind: 'waitPortFree' }                 // 等待出库口空闲
