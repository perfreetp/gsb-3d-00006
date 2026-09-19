import { reactive } from 'vue'
import {
  LEVELS, COLUMNS, STATION_X, IN_PORT_Z, OUT_PORT_Z,
  CONVEYOR_START_X, CONVEYOR_Y, CRANE_SPEED_X, CRANE_SPEED_Y,
  FORK_SPEED, CONVEYOR_SPEED, PALLET_GAP, slotX, slotY, slotZ
} from './config'
import { Pallet, Task, CraneStep, SlotCoord, slotKey } from './types'

const GOODS = ['电子元件', '食品箱', '服装', '医药用品', '汽车配件', '图书', '家电', '日化用品', '五金工具', '饮料']
const PALETTE = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xfd79a8, 0x00cec9, 0xd63031]

// 暴露给 Vue UI 的响应式状态
export const ui = reactive({
  paused: false,
  speed: 1,
  craneState: '空闲',
  cranePos: { x: 0, y: 0 },
  currentTask: null as Task | null,
  tasks: [] as Task[],
  stats: { inboundDone: 0, outboundDone: 0 },
  occupancy: 0,
  totalSlots: LEVELS * COLUMNS * 2,
  selected: null as { coord: SlotCoord; pallet: Pallet | null } | null
})

interface CraneState {
  x: number
  y: number
  forkZ: number
  carrying: number | null
  steps: CraneStep[]
  task: Task | null
  label: string
}

function moveToward(cur: number, target: number, maxDelta: number): { value: number; done: boolean } {
  const diff = target - cur
  if (Math.abs(diff) <= maxDelta) return { value: target, done: true }
  return { value: cur + Math.sign(diff) * maxDelta, done: false }
}

export class Simulation {
  pallets = new Map<number, Pallet>()
  slots = new Map<string, number>() // 货位 -> 托盘ID
  tasks: Task[] = []
  crane: CraneState = {
    x: STATION_X, y: CONVEYOR_Y, forkZ: 0,
    carrying: null, steps: [], task: null, label: '空闲'
  }
  private nextPalletId = 1
  private nextTaskId = 1
  private genTimer = 2

  constructor() {
    this.initInventory()
  }

  // 初始库存：随机填充约 30% 货位
  private initInventory() {
    for (const side of [0, 1] as const) {
      for (let c = 0; c < COLUMNS; c++) {
        for (let l = 0; l < LEVELS; l++) {
          if (Math.random() < 0.3) {
            const coord: SlotCoord = { side, column: c, level: l }
            const pallet = this.createPallet()
            pallet.loc = 'slot'
            pallet.slot = coord
            pallet.x = slotX(c); pallet.y = slotY(l); pallet.z = slotZ(side)
            this.slots.set(slotKey(coord), pallet.id)
          }
        }
      }
    }
  }

  private createPallet(): Pallet {
    const pallet: Pallet = {
      id: this.nextPalletId++,
      goods: GOODS[Math.floor(Math.random() * GOODS.length)],
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      loc: 'conveyor', x: 0, y: 0, z: 0, dir: 'in', slot: null
    }
    this.pallets.set(pallet.id, pallet)
    return pallet
  }

  private emptySlotCoords(): SlotCoord[] {
    const result: SlotCoord[] = []
    for (const side of [0, 1] as const)
      for (let c = 0; c < COLUMNS; c++)
        for (let l = 0; l < LEVELS; l++) {
          const coord = { side, column: c, level: l }
          if (!this.slots.has(slotKey(coord))) result.push(coord)
        }
    return result
  }

  private occupiedSlotCoords(): SlotCoord[] {
    const result: SlotCoord[] = []
    for (const key of this.slots.keys()) {
      const [side, column, level] = key.split('-').map(Number)
      result.push({ side: side as 0 | 1, column, level })
    }
    return result
  }

  // ---------------- 任务生成 ----------------
  private generateTask() {
    const pending = this.tasks.filter(t => t.state !== 'done').length
    if (pending >= 6) return
    const wantInbound = Math.random() < 0.55
    if (wantInbound) {
      const empties = this.emptySlotCoords()
      if (!empties.length) return
      const slot = empties[Math.floor(Math.random() * empties.length)]
      const pallet = this.createPallet()
      // 托盘先放在"待上线"虚拟位置，等输送线入口空闲再上线
      pallet.loc = 'conveyor'
      pallet.x = CONVEYOR_START_X - 2 // 标记为未上线
      pallet.y = CONVEYOR_Y
      pallet.z = IN_PORT_Z
      pallet.dir = 'in'
      this.tasks.push({ id: this.nextTaskId++, type: 'inbound', palletId: pallet.id, slot, state: 'pending' })
    } else {
      const occupied = this.occupiedSlotCoords()
      if (!occupied.length) return
      const slot = occupied[Math.floor(Math.random() * occupied.length)]
      const palletId = this.slots.get(slotKey(slot))!
      this.tasks.push({ id: this.nextTaskId++, type: 'outbound', palletId, slot, state: 'pending' })
    }
  }

  // ---------------- 堆垛机作业序列 ----------------
  private buildJob(task: Task): CraneStep[] {
    const s = task.slot
    const sx = slotX(s.column), sy = slotY(s.level), sz = slotZ(s.side)
    if (task.type === 'inbound') {
      return [
        { kind: 'move', x: STATION_X, y: CONVEYOR_Y - 0.13 },
        { kind: 'fork', z: IN_PORT_Z },
        { kind: 'lift', dy: 0.18 },
        { kind: 'attachPort' },
        { kind: 'fork', z: 0 },
        { kind: 'move', x: sx, y: sy + 0.18 },
        { kind: 'fork', z: sz },
        { kind: 'lift', dy: -0.18 },
        { kind: 'detachSlot' },
        { kind: 'fork', z: 0 }
      ]
    }
    return [
      { kind: 'move', x: sx, y: sy - 0.13 },
      { kind: 'fork', z: sz },
      { kind: 'lift', dy: 0.18 },
      { kind: 'attachSlot' },
      { kind: 'fork', z: 0 },
      { kind: 'waitPortFree' },
      { kind: 'move', x: STATION_X, y: CONVEYOR_Y + 0.18 },
      { kind: 'fork', z: OUT_PORT_Z },
      { kind: 'lift', dy: -0.18 },
      { kind: 'detachPort' },
      { kind: 'fork', z: 0 }
    ]
  }

  private taskReady(task: Task): boolean {
    if (task.type === 'outbound') return true
    const pallet = this.pallets.get(task.palletId)
    return !!pallet && pallet.loc === 'conveyor' && pallet.dir === 'in' && pallet.x >= STATION_X - 0.01
  }

  private outPortFree(): boolean {
    for (const p of this.pallets.values()) {
      if (p.loc === 'conveyor' && p.dir === 'out' && Math.abs(p.x - STATION_X) < 0.7) return false
    }
    return true
  }

  // ---------------- 堆垛机状态机 ----------------
  private updateCrane(dt: number) {
    const crane = this.crane
    if (!crane.task) {
      const next = this.tasks.find(t => t.state === 'pending' && this.taskReady(t))
      if (next) {
        next.state = 'active'
        crane.task = next
        crane.steps = this.buildJob(next)
        crane.label = next.type === 'inbound' ? '入库作业' : '出库作业'
      } else {
        crane.label = '空闲'
        return
      }
    }

    const step = crane.steps[0]
    if (!step) { // 作业完成
      this.finishTask()
      return
    }

    switch (step.kind) {
      case 'move': {
        crane.label = (crane.task!.type === 'inbound' ? '入库-' : '出库-') + '移动定位'
        const rx = moveToward(crane.x, step.x, CRANE_SPEED_X * dt)
        const ry = moveToward(crane.y, step.y, CRANE_SPEED_Y * dt)
        crane.x = rx.value; crane.y = ry.value
        if (rx.done && ry.done) crane.steps.shift()
        break
      }
      case 'fork': {
        crane.label = step.z === 0 ? '货叉收回' : '货叉伸出'
        const rz = moveToward(crane.forkZ, step.z, FORK_SPEED * dt)
        crane.forkZ = rz.value
        if (rz.done) crane.steps.shift()
        break
      }
      case 'lift': {
        crane.label = step.dy > 0 ? '顶升取货' : '下降放货'
        if (step.targetY === undefined) step.targetY = crane.y + step.dy
        const ry = moveToward(crane.y, step.targetY, CRANE_SPEED_Y * 0.5 * dt)
        crane.y = ry.value
        if (ry.done) crane.steps.shift()
        break
      }
      case 'attachSlot': {
        const key = slotKey(crane.task!.slot)
        const pid = this.slots.get(key)
        if (pid !== undefined) {
          this.slots.delete(key)
          const pallet = this.pallets.get(pid)!
          pallet.loc = 'crane'
          pallet.slot = null
          crane.carrying = pid
        }
        crane.steps.shift()
        break
      }
      case 'detachSlot': {
        const coord = crane.task!.slot
        const pid = crane.carrying!
        const pallet = this.pallets.get(pid)!
        pallet.loc = 'slot'
        pallet.slot = coord
        pallet.x = slotX(coord.column); pallet.y = slotY(coord.level); pallet.z = slotZ(coord.side)
        this.slots.set(slotKey(coord), pid)
        crane.carrying = null
        crane.steps.shift()
        break
      }
      case 'attachPort': {
        const pid = crane.task!.palletId
        const pallet = this.pallets.get(pid)!
        pallet.loc = 'crane'
        crane.carrying = pid
        crane.steps.shift()
        break
      }
      case 'detachPort': {
        if (crane.carrying === null) { crane.steps.shift(); break }
        const pid = crane.carrying
        const pallet = this.pallets.get(pid)!
        pallet.loc = 'conveyor'
        pallet.dir = 'out'
        pallet.x = STATION_X
        pallet.y = CONVEYOR_Y
        pallet.z = OUT_PORT_Z
        crane.carrying = null
        crane.steps.shift()
        break
      }
      case 'waitPortFree': {
        crane.label = '等待出库口空闲'
        if (this.outPortFree()) crane.steps.shift()
        break
      }
    }
  }

  private finishTask() {
    const task = this.crane.task!
    task.state = 'done'
    if (task.type === 'inbound') ui.stats.inboundDone++
    else ui.stats.outboundDone++
    this.tasks = this.tasks.filter(t => t.state !== 'done')
    this.crane.task = null
    this.crane.steps = []
    this.crane.label = '空闲'
  }

  // ---------------- 输送线 ----------------
  private updateConveyor(dt: number) {
    // 入库托盘上线：入口空闲时从待上线位置进入
    for (const p of this.pallets.values()) {
      if (p.loc === 'conveyor' && p.dir === 'in' && p.x < CONVEYOR_START_X) {
        let entryFree = true
        for (const q of this.pallets.values()) {
          if (q !== p && q.loc === 'conveyor' && q.dir === 'in' &&
              q.x >= CONVEYOR_START_X && q.x < CONVEYOR_START_X + PALLET_GAP) { entryFree = false; break }
        }
        if (entryFree) p.x = CONVEYOR_START_X
      }
    }

    // 入库方向（+X），按前后顺序防碰撞
    const inbound = [...this.pallets.values()]
      .filter(p => p.loc === 'conveyor' && p.dir === 'in' && p.x >= CONVEYOR_START_X)
      .sort((a, b) => b.x - a.x)
    for (let i = 0; i < inbound.length; i++) {
      const p = inbound[i]
      let limit = STATION_X
      if (i > 0) limit = Math.min(limit, inbound[i - 1].x - PALLET_GAP)
      else {
        // 队首：入库口被出库托盘占用时停在口外
        if (!this.inPortFree()) limit = STATION_X - PALLET_GAP
      }
      p.x = Math.min(p.x + CONVEYOR_SPEED * dt, limit)
      p.y = CONVEYOR_Y
      p.z = IN_PORT_Z
    }

    // 出库方向（-X），到达末端后移除
    const outbound = [...this.pallets.values()]
      .filter(p => p.loc === 'conveyor' && p.dir === 'out')
      .sort((a, b) => a.x - b.x)
    const toRemove: number[] = []
    for (let i = 0; i < outbound.length; i++) {
      const p = outbound[i]
      let limit = -Infinity
      if (i > 0) limit = outbound[i - 1].x + PALLET_GAP
      p.x = Math.max(p.x - CONVEYOR_SPEED * dt, limit)
      p.y = CONVEYOR_Y
      p.z = OUT_PORT_Z
      if (p.x <= CONVEYOR_START_X + 0.05) toRemove.push(p.id)
    }
    for (const id of toRemove) this.pallets.delete(id)
  }

  private inPortFree(): boolean {
    for (const p of this.pallets.values()) {
      if (p.loc === 'conveyor' && p.dir === 'in' && Math.abs(p.x - STATION_X) < 0.01) return false
    }
    return true
  }

  // ---------------- 主循环 ----------------
  update(dt: number) {
    if (dt <= 0) { this.syncUi(); return }

    this.genTimer -= dt
    if (this.genTimer <= 0) {
      this.generateTask()
      this.genTimer = 4 + Math.random() * 5
    }

    this.updateConveyor(dt)
    this.updateCrane(dt)

    // 堆垛机载货跟随
    if (this.crane.carrying !== null) {
      const pallet = this.pallets.get(this.crane.carrying)
      if (pallet) {
        pallet.x = this.crane.x
        pallet.y = this.crane.y + 0.08
        pallet.z = this.crane.forkZ
      }
    }
    this.syncUi()
  }

  private syncUi() {
    ui.craneState = this.crane.label
    ui.cranePos.x = this.crane.x
    ui.cranePos.y = this.crane.y
    ui.currentTask = this.crane.task
    ui.tasks = [...this.tasks]
    ui.occupancy = this.slots.size
    if (ui.selected) {
      const pid = this.slots.get(slotKey(ui.selected.coord))
      ui.selected.pallet = pid !== undefined ? this.pallets.get(pid) ?? null : null
    }
  }

  selectSlot(coord: SlotCoord | null) {
    if (!coord) { ui.selected = null; return }
    const pid = this.slots.get(slotKey(coord))
    ui.selected = {
      coord,
      pallet: pid !== undefined ? this.pallets.get(pid) ?? null : null
    }
  }
}

export const sim = new Simulation()
