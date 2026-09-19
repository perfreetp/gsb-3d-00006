export type Side = 'A' | 'B'
export type TaskKind = 'INBOUND' | 'OUTBOUND'
export type TaskPhase =
  | 'QUEUED'
  | 'MOVE_TO_SOURCE'
  | 'PICK_SOURCE'
  | 'MOVE_TO_TARGET'
  | 'DROP_TARGET'
  | 'DONE'

export interface CellKey {
  side: Side
  level: number
  col: number
}

export interface CargoInfo {
  id: string
  name: string
  color: number
  side: Side
  level: number
  col: number
}

export interface Task {
  id: number
  kind: TaskKind
  phase: TaskPhase
  cell: CellKey
  cargoName: string
  color: number
  createdAt: number
}

export interface CraneSnapshot {
  x: number
  z: number
  liftY: number
  forkExt: number
  loadId: string | null
  speedX: number
  speedZ: number
}

export interface StationSnapshot {
  inboundOccupied: boolean
  inboundCargo: string | null
  inboundReady: boolean
  outboundOccupied: boolean
  outboundCargo: string | null
  outboundReady: boolean
}

export interface SimSnapshot {
  paused: boolean
  speed: number
  simTime: number
  crane: CraneSnapshot
  stations: StationSnapshot
  current: Task | null
  queue: Task[]
  completedCount: number
  inboundCount: number
  outboundCount: number
  occupiedCount: number
  totalCells: number
  occupancy: boolean[][]
  selected: { key: CellKey; occupied: boolean; cargo: CargoInfo | null } | null
  logs: { time: number; text: string; kind: TaskKind | 'SYS' }[]
  stats: {
    moves: number
    picks: number
    drops: number
    utilization: number
  }
}
