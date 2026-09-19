import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CONFIG, cellZ, storageBaseY } from './config'
import { buildScene, type StaticScene } from './scene'
import { buildCrane, type CraneRig } from './crane'
import { PALETTE, CARGO_TYPES, cargoMaterial } from './materials'
import { makeTextSprite } from './labels'
import type { CargoInfo, CellKey, Side, SimSnapshot, Task, TaskKind } from '../types'

type CraneStep =
  | 'IDLE'
  | 'GOTO_SOURCE'
  | 'EXTEND_SOURCE'
  | 'WAIT_SOURCE'
  | 'LIFT_SOURCE'
  | 'RETRACT_SOURCE'
  | 'TRAVEL_TARGET'
  | 'EXTEND_TARGET'
  | 'LOWER_TARGET'
  | 'RETRACT_TARGET'

interface PalletObj {
  group: THREE.Group
  info: CargoInfo
}

interface BeltState {
  side: Side
  x: number
  rollers: THREE.Mesh[]
  lamp: THREE.Mesh
  ready: PalletObj | null
  moving: { pallet: PalletObj; z: number; dir: 1 | -1 } | null
}

const keyOf = (side: Side, level: number, col: number) => `${side}-${level}-${col}`
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export class Simulation {
  private renderer: THREE.WebGLRenderer
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private clock = new THREE.Clock()
  private raf = 0
  private staticScene: StaticScene
  private crane: CraneRig
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private downPos = { x: 0, y: 0 }

  paused = false
  speed = 1
  private simTime = 0

  private occupancy = new Map<string, CargoInfo>()
  private storedMeshes = new Map<string, THREE.Group>()
  private reservations = new Set<string>()
  private craneSide: Side = 'A'
  private load: PalletObj | null = null

  private craneStep: CraneStep = 'IDLE'
  private pose: { z: number; liftY: number; ext: number } = {
    z: CONFIG.STATION_Z,
    liftY: 0.5,
    ext: 0
  }
  private target: { z: number; liftY: number; ext: number } = {
    z: CONFIG.STATION_Z,
    liftY: 0.5,
    ext: 0
  }

  private queue: Task[] = []
  private current: Task | null = null
  private taskSeq = 1
  private completedCount = 0
  private inboundCount = 0
  private outboundCount = 0
  private counters = { moves: 0, picks: 0, drops: 0 }
  private logs: SimSnapshot['logs'] = []

  private inbound!: BeltState
  private outbound!: BeltState
  private inboundTimer = 3
  private outboundTimer = 8

  private selectedKey: CellKey | null = null
  private highlight: THREE.LineSegments
  onSelectChange: (() => void) | null = null

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    )
    this.camera.position.set(15, 12, -19)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 2.6, 0)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI / 2.05
    this.controls.minDistance = 6
    this.controls.maxDistance = 55
    this.controls.update()

    this.staticScene = buildScene()
    this.crane = buildCrane(this.staticScene.scene)

    this.inbound = {
      side: 'A',
      x: CONFIG.INBOUND_X,
      rollers: this.staticScene.conveyors.IN.rollers,
      lamp: this.staticScene.conveyors.IN.lampIn,
      ready: null,
      moving: null
    }
    this.outbound = {
      side: 'B',
      x: CONFIG.OUTBOUND_X,
      rollers: this.staticScene.conveyors.OUT.rollers,
      lamp: this.staticScene.conveyors.OUT.lampIn,
      ready: null,
      moving: null
    }

    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(CONFIG.RACK_DEPTH * 0.9, CONFIG.LEVEL_H * 0.86, CONFIG.BAY * 0.86)
      ),
      new THREE.LineBasicMaterial({ color: 0xfbbf24 })
    )
    this.highlight.visible = false
    this.staticScene.scene.add(this.highlight)

    window.addEventListener('resize', this.onResize)
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp)

    this.prefill(24)
    this.loop()
  }

  private addLog(text: string, kind: SimSnapshot['logs'][number]['kind'] = 'SYS') {
    this.logs.unshift({ time: this.simTime, text, kind })
    if (this.logs.length > 40) this.logs.length = 40
  }

  private sign(side: Side) {
    return side === 'A' ? 1 : -1
  }

  private rackRestY(level: number) {
    return storageBaseY(level)
  }

  private stationRestY() {
    return CONFIG.CONVEYOR_Y + 0.07
  }

  private makePallet(info: CargoInfo): PalletObj {
    const group = new THREE.Group()
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.12, 0.86), PALETTE.pallet)
    pallet.position.y = 0.06
    pallet.castShadow = true
    pallet.receiveShadow = true
    group.add(pallet)
    const boxH = 0.46 + (info.id.charCodeAt(info.id.length - 1) % 4) * 0.06
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.74, boxH, 0.74), cargoMaterial(info.color))
    box.position.y = 0.12 + boxH / 2
    box.castShadow = true
    group.add(box)
    const label = makeTextSprite(info.name, { fontSize: 34, scale: 0.0032 })
    label.position.y = 0.12 + boxH + 0.22
    group.add(label)
    return { group, info }
  }

  private randomCargo() {
    return CARGO_TYPES[Math.floor(Math.random() * CARGO_TYPES.length)]
  }

  private randomEmptyCell(): CellKey | null {
    const empties: CellKey[] = []
    for (const side of ['A', 'B'] as Side[]) {
      for (let lv = 0; lv < CONFIG.LEVELS; lv++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          const k = keyOf(side, lv, c)
          if (!this.occupancy.has(k) && !this.reservations.has(k)) {
            empties.push({ side, level: lv, col: c })
          }
        }
      }
    }
    return empties.length ? empties[Math.floor(Math.random() * empties.length)] : null
  }

  private randomOccupiedCell(): CellKey | null {
    const cells: CellKey[] = []
    for (const info of this.occupancy.values()) {
      if (!this.reservations.has(keyOf(info.side, info.level, info.col))) {
        cells.push({ side: info.side, level: info.level, col: info.col })
      }
    }
    return cells.length ? cells[Math.floor(Math.random() * cells.length)] : null
  }

  private spawnTask(kind: TaskKind): boolean {
    if (this.queue.length >= 4) return false
    if (kind === 'OUTBOUND') {
      const cell = this.randomOccupiedCell()
      if (!cell) return false
      const info = this.occupancy.get(keyOf(cell.side, cell.level, cell.col))!
      this.reservations.add(keyOf(cell.side, cell.level, cell.col))
      this.queue.push({
        id: this.taskSeq++,
        kind,
        phase: 'QUEUED',
        cell,
        cargoName: info.name,
        color: info.color,
        createdAt: this.simTime
      })
      return true
    }
    const cell = this.randomEmptyCell()
    if (!cell) return false
    const t = this.randomCargo()
    this.reservations.add(keyOf(cell.side, cell.level, cell.col))
    this.queue.push({
      id: this.taskSeq++,
      kind,
      phase: 'QUEUED',
      cell,
      cargoName: t.name,
      color: t.color,
      createdAt: this.simTime
    })
    return true
  }

  private prefill(n: number) {
    let placed = 0
    let guard = 0
    while (placed < n && guard < 500) {
      guard++
      const cell = this.randomEmptyCell()
      if (!cell) break
      const t = this.randomCargo()
      const info: CargoInfo = {
        id: `P${this.taskSeq++}`,
        name: t.name,
        color: t.color,
        side: cell.side,
        level: cell.level,
        col: cell.col
      }
      const pallet = this.makePallet(info)
      this.placeAtRest(pallet, cell)
      this.occupancy.set(keyOf(cell.side, cell.level, cell.col), info)
      placed++
    }
  }

  private placeAtRest(pallet: PalletObj, cell: CellKey) {
    pallet.group.rotation.y = 0
    pallet.group.position.set(
      this.sign(cell.side) * CONFIG.STORAGE_X,
      this.rackRestY(cell.level),
      cellZ(cell.col)
    )
    this.staticScene.scene.add(pallet.group)
    this.storedMeshes.set(keyOf(cell.side, cell.level, cell.col), pallet.group)
  }

  private setBeltLamp(belt: BeltState, active: boolean) {
    const mat = belt.lamp.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = active ? 2.2 : 0.15
  }

  private spawnInboundCargo() {
    const t = this.randomCargo()
    const info: CargoInfo = {
      id: `P${this.taskSeq++}`,
      name: t.name,
      color: t.color,
      side: 'A',
      level: 0,
      col: 0
    }
    const pallet = this.makePallet(info)
    pallet.group.position.set(this.inbound.x, this.stationRestY(), CONFIG.CONVEYOR_FAR_Z - 0.3)
    this.staticScene.scene.add(pallet.group)
    this.inbound.moving = { pallet, z: CONFIG.CONVEYOR_FAR_Z - 0.3, dir: 1 }
    this.addLog(`入库货物到达：${t.name}（${info.id}）`, 'INBOUND')
  }

  private removePallet(pallet: PalletObj) {
    pallet.group.removeFromParent()
  }

  private updateBelts(activeDt: number, rawDt: number) {
    const inM = this.inbound.moving
    if (inM) {
      inM.z += CONFIG.CONVEYOR_SPEED * activeDt
      inM.pallet.group.position.z = inM.z
      if (inM.z >= CONFIG.STATION_Z + 0.25) {
        inM.z = CONFIG.STATION_Z + 0.25
        inM.pallet.group.position.z = inM.z
        this.inbound.ready = inM.pallet
        this.inbound.moving = null
      }
    }
    const outM = this.outbound.moving
    if (outM) {
      outM.z -= CONFIG.CONVEYOR_SPEED * activeDt
      outM.pallet.group.position.z = outM.z
      if (outM.z <= CONFIG.CONVEYOR_FAR_Z + 0.3) {
        this.addLog(`出库完成：${outM.pallet.info.name}（${outM.pallet.info.id}）`, 'OUTBOUND')
        this.removePallet(outM.pallet)
        this.outbound.moving = null
      }
    }
    this.setBeltLamp(this.inbound, !!this.inbound.ready)
    this.setBeltLamp(this.outbound, !!this.outbound.ready || !!outM)

    if (activeDt > 0) {
      this.inboundTimer -= activeDt
      if (this.inboundTimer <= 0 && !this.inbound.moving && !this.inbound.ready) {
        this.spawnInboundCargo()
        this.inboundTimer = 9 + Math.random() * 9
      }
      this.outboundTimer -= activeDt
      if (this.outboundTimer <= 0) {
        if (this.spawnTask('OUTBOUND')) this.outboundTimer = 11 + Math.random() * 10
        else this.outboundTimer = 3
      }
    }

    const spin = CONFIG.CONVEYOR_SPEED * rawDt * 3
    for (const r of this.inbound.rollers) r.rotateX(spin)
    for (const r of this.outbound.rollers) r.rotateX(-spin)
  }

  private startTask(task: Task) {
    this.current = task
    task.phase = 'MOVE_TO_SOURCE'
    if (task.kind === 'INBOUND') {
      this.craneSide = this.inbound.side
      this.target.z = CONFIG.STATION_Z
      this.target.liftY = this.stationRestY() - 0.12
    } else {
      this.craneSide = task.cell.side
      this.target.z = cellZ(task.cell.col)
      this.target.liftY = this.rackRestY(task.cell.level) - 0.12
    }
    this.target.ext = 0
    this.craneStep = 'GOTO_SOURCE'
    this.counters.moves++
  }

  private scheduleNext() {
    if (this.craneStep !== 'IDLE' || this.queue.length === 0) return
    const idx = this.queue.findIndex((t) => t.kind !== 'INBOUND' || !!this.inbound.ready)
    if (idx === -1) return
    const [task] = this.queue.splice(idx, 1)
    this.startTask(task)
  }

  private takeStored(cell: CellKey): PalletObj | undefined {
    const k = keyOf(cell.side, cell.level, cell.col)
    const info = this.occupancy.get(k)
    const group = this.storedMeshes.get(k)
    if (!info || !group) return undefined
    this.occupancy.delete(k)
    this.storedMeshes.delete(k)
    return { group, info }
  }

  private detachToRack(cell: CellKey) {
    if (!this.load) return
    const pallet = this.load
    this.staticScene.scene.add(pallet.group)
    pallet.group.rotation.set(0, 0, 0)
    pallet.group.position.set(
      this.sign(cell.side) * CONFIG.STORAGE_X,
      this.rackRestY(cell.level),
      cellZ(cell.col)
    )
    const info: CargoInfo = { ...pallet.info, side: cell.side, level: cell.level, col: cell.col }
    pallet.info = info
    this.occupancy.set(keyOf(cell.side, cell.level, cell.col), info)
    this.storedMeshes.set(keyOf(cell.side, cell.level, cell.col), pallet.group)
    this.load = null
  }

  private detachToOutbound() {
    if (!this.load) return
    const pallet = this.load
    this.staticScene.scene.add(pallet.group)
    pallet.group.rotation.set(0, 0, 0)
    pallet.group.position.set(this.outbound.x, this.stationRestY(), CONFIG.STATION_Z + 0.25)
    this.outbound.moving = { pallet, z: CONFIG.STATION_Z + 0.25, dir: -1 }
    this.load = null
  }

  private finishTask(task: Task) {
    task.phase = 'DONE'
    this.completedCount++
    if (task.kind === 'INBOUND') {
      this.inboundCount++
      this.addLog(
        `任务#${task.id} 入库完成：${task.cargoName} → ${task.cell.side}区 ${task.cell.level + 1}层 ${task.cell.col + 1}列`,
        'INBOUND'
      )
    } else {
      this.outboundCount++
      this.addLog(`任务#${task.id} 出库完成：${task.cargoName} 已送至出库口`, 'OUTBOUND')
    }
  }

  private arrive(v: number, target: number, eps = 0.02) {
    return Math.abs(v - target) <= eps
  }

  private moveAxis(v: number, target: number, rate: number, dt: number) {
    const d = target - v
    const step = rate * dt
    if (Math.abs(d) <= step) return target
    return v + Math.sign(d) * step
  }

  private requiredExt(task: Task, atTarget: boolean): number {
    const isRack = atTarget ? task.kind === 'INBOUND' : task.kind === 'OUTBOUND'
    return isRack ? CONFIG.FORK_EXT_RACK : CONFIG.FORK_EXT_STATION
  }

  private updateCrane(dt: number) {
    if (!this.current || this.craneStep === 'IDLE') {
      this.scheduleNext()
      if (!this.current) {
        this.pose.ext = this.moveAxis(this.pose.ext, 0, CONFIG.FORK_SPEED, dt)
      }
      this.crane.setPose(this.craneSide, this.pose.z, this.pose.liftY, this.pose.ext)
      return
    }
    const task = this.current

    this.pose.z = this.moveAxis(this.pose.z, this.target.z, CONFIG.CRANE_SPEED_Z, dt)
    this.pose.liftY = this.moveAxis(this.pose.liftY, this.target.liftY, CONFIG.LIFT_SPEED, dt)
    this.pose.ext = this.moveAxis(this.pose.ext, this.target.ext, CONFIG.FORK_SPEED * 1.5, dt)
    this.crane.setPose(this.craneSide, this.pose.z, this.pose.liftY, this.pose.ext)

    const zOk = this.arrive(this.pose.z, this.target.z)
    const liftOk = this.arrive(this.pose.liftY, this.target.liftY)
    const extOk = this.arrive(this.pose.ext, this.target.ext, 0.015)

    switch (this.craneStep) {
      case 'GOTO_SOURCE':
        if (zOk && liftOk) {
          this.target.ext = this.requiredExt(task, false)
          this.craneStep = 'EXTEND_SOURCE'
        }
        break
      case 'EXTEND_SOURCE':
        if (extOk) {
          let pallet: PalletObj | undefined
          if (task.kind === 'OUTBOUND') {
            pallet = this.takeStored(task.cell)
          } else {
            pallet = this.inbound.ready ?? undefined
            if (pallet) this.inbound.ready = null
          }
          if (!pallet) {
            this.target.ext = 0
            this.craneStep = 'WAIT_SOURCE'
            break
          }
          const worldX =
            task.kind === 'OUTBOUND' ? this.sign(task.cell.side) * CONFIG.STORAGE_X : this.inbound.x
          const localX = Math.abs(worldX) - 0.55 - this.target.ext
          this.crane.fork.add(pallet.group)
          pallet.group.rotation.set(0, 0, 0)
          pallet.group.position.set(localX, 0.12, 0)
          this.load = pallet
          this.reservations.delete(keyOf(task.cell.side, task.cell.level, task.cell.col))
          this.target.liftY = this.pose.liftY + CONFIG.MICRO_LIFT
          this.craneStep = 'LIFT_SOURCE'
          task.phase = 'PICK_SOURCE'
          this.counters.picks++
        }
        break
      case 'WAIT_SOURCE':
        if (this.inbound.ready && this.arrive(this.pose.ext, 0, 0.02)) {
          this.target.ext = this.requiredExt(task, false)
          this.craneStep = 'EXTEND_SOURCE'
        }
        break
      case 'LIFT_SOURCE':
        if (liftOk) {
          this.target.ext = 0
          this.craneStep = 'RETRACT_SOURCE'
        }
        break
      case 'RETRACT_SOURCE':
        if (extOk) {
          if (task.kind === 'INBOUND') {
            this.craneSide = task.cell.side
            this.target.z = cellZ(task.cell.col)
            this.target.liftY = this.rackRestY(task.cell.level) + 0.15
          } else {
            this.craneSide = 'B'
            this.target.z = CONFIG.STATION_Z
            this.target.liftY = this.stationRestY() + 0.15
          }
          this.craneStep = 'TRAVEL_TARGET'
          task.phase = 'MOVE_TO_TARGET'
          this.counters.moves++
        }
        break
      case 'TRAVEL_TARGET':
        if (zOk && liftOk) {
          this.target.ext = this.requiredExt(task, true)
          this.craneStep = 'EXTEND_TARGET'
          task.phase = 'DROP_TARGET'
        }
        break
      case 'EXTEND_TARGET':
        if (extOk) {
          this.target.liftY =
            task.kind === 'INBOUND'
              ? this.rackRestY(task.cell.level) - 0.06
              : this.stationRestY() - 0.06
          this.craneStep = 'LOWER_TARGET'
        }
        break
      case 'LOWER_TARGET':
        if (liftOk) {
          if (task.kind === 'INBOUND') this.detachToRack(task.cell)
          else this.detachToOutbound()
          this.counters.drops++
          this.target.ext = 0
          this.craneStep = 'RETRACT_TARGET'
        }
        break
      case 'RETRACT_TARGET':
        if (extOk) {
          this.finishTask(task)
          this.craneStep = 'IDLE'
          this.current = null
          this.scheduleNext()
        }
        break
    }
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop)
    const rawDt = Math.min(this.clock.getDelta(), 0.05)
    const activeDt = this.paused ? 0 : rawDt * this.speed
    if (activeDt > 0) this.simTime += activeDt
    this.updateBelts(activeDt, rawDt)
    if (activeDt > 0) {
      this.updateCrane(activeDt)
      this.maybeAutoInbound()
    }
    this.controls.update()
    this.renderer.render(this.staticScene.scene, this.camera)
  }

  private maybeAutoInbound() {
    const pending = this.queue.filter((t) => t.kind === 'INBOUND').length
    if (this.inbound.ready && pending === 0 && this.queue.length < 4) {
      this.spawnTask('INBOUND')
      this.scheduleNext()
    }
  }

  private onResize = () => {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  private onPointerDown = (e: PointerEvent) => {
    this.downPos = { x: e.clientX, y: e.clientY }
  }

  private onPointerUp = (e: PointerEvent) => {
    const moved = Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y)
    if (moved > 5) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const meshes = this.staticScene.cellHits.map((h) => h.mesh)
    const hit = this.raycaster.intersectObjects(meshes, false)[0]
    if (!hit) {
      this.setSelected(null)
      return
    }
    const { side, level, col } = hit.object.userData as {
      side: Side
      level: number
      col: number
    }
    this.setSelected({ side, level, col })
  }

  private setSelected(key: CellKey | null) {
    this.selectedKey = key
    if (!key) {
      this.highlight.visible = false
    } else {
      this.highlight.visible = true
      this.highlight.position.set(
        this.sign(key.side) * CONFIG.STORAGE_X,
        storageBaseY(key.level) + CONFIG.LEVEL_H / 2,
        cellZ(key.col)
      )
    }
    this.onSelectChange?.()
  }

  private selectedSnapshot(): SimSnapshot['selected'] {
    if (!this.selectedKey) return null
    const { side, level, col } = this.selectedKey
    const occupied = this.occupancy.get(keyOf(side, level, col)) ?? null
    return { key: { side, level, col }, occupied: !!occupied, cargo: occupied }
  }

  getSnapshot(): SimSnapshot {
    const totalCells = CONFIG.COLS * CONFIG.LEVELS * 2
    const occ: boolean[][] = []
    for (const side of ['A', 'B'] as Side[]) {
      const panel: boolean[] = []
      for (let lv = CONFIG.LEVELS - 1; lv >= 0; lv--) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          panel.push(this.occupancy.has(keyOf(side, lv, c)))
        }
      }
      occ.push(panel)
    }
    return {
      paused: this.paused,
      speed: this.speed,
      simTime: this.simTime,
      crane: {
        x: 0,
        z: this.pose.z,
        liftY: this.pose.liftY,
        forkExt: this.pose.ext,
        loadId: this.load?.info.id ?? null,
        speedX: 0,
        speedZ: this.current ? CONFIG.CRANE_SPEED_Z : 0
      },
      stations: {
        inboundOccupied: !!this.inbound.ready,
        inboundCargo:
          this.inbound.ready?.info.name ?? this.inbound.moving?.pallet.info.name ?? null,
        inboundReady: !!this.inbound.ready,
        outboundOccupied: !!this.outbound.moving,
        outboundCargo: this.outbound.moving?.pallet.info.name ?? null,
        outboundReady: !!this.outbound.moving
      },
      current: this.current ? { ...this.current } : null,
      queue: this.queue.map((t) => ({ ...t })),
      completedCount: this.completedCount,
      inboundCount: this.inboundCount,
      outboundCount: this.outboundCount,
      occupiedCount: this.occupancy.size,
      totalCells,
      occupancy: occ,
      selected: this.selectedSnapshot(),
      logs: [...this.logs],
      stats: {
        moves: this.counters.moves,
        picks: this.counters.picks,
        drops: this.counters.drops,
        utilization: this.occupancy.size / totalCells
      }
    }
  }

  setPaused(p: boolean) {
    this.paused = p
  }

  togglePause() {
    this.paused = !this.paused
    this.addLog(this.paused ? '仿真已暂停' : '仿真继续运行', 'SYS')
  }

  setSpeed(v: number) {
    this.speed = clamp(v, 0.25, 6)
  }

  addInbound() {
    if (this.spawnTask('INBOUND')) {
      this.addLog('手动下发入库任务', 'INBOUND')
      this.scheduleNext()
    }
  }

  addOutbound() {
    if (this.spawnTask('OUTBOUND')) {
      this.addLog('手动下发出库任务', 'OUTBOUND')
      this.scheduleNext()
    }
  }

  resetView() {
    this.camera.position.set(15, 12, -19)
    this.controls.target.set(0, 2.6, 0)
    this.controls.update()
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp)
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
