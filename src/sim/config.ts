export const CONFIG = {
  COLS: 16,
  LEVELS: 6,
  BAY: 1.15,
  LEVEL_H: 0.95,
  FIRST_SHELF_BASE: 0.5,

  AISLE_FACE_X: 1.32,
  RACK_DEPTH: 1.05,
  STORAGE_X: 1.62,
  FORK_EXT_RACK: 0.90,
  FORK_EXT_STATION: 0.78,

  STATION_Z: -10.1,
  AISLE_END_Z: -9.2,
  CONVEYOR_FAR_Z: -13.7,
  INBOUND_X: 1.5,
  OUTBOUND_X: -1.5,
  CONVEYOR_Y: 0.42,

  RAIL_MIN_Z: -10.9,
  RAIL_MAX_Z: 9.6,
  MAST_HEIGHT: 7.1,

  CRANE_SPEED_Z: 3.2,
  LIFT_SPEED: 2.0,
  FORK_SPEED: 1.6,
  MICRO_LIFT: 0.18,
  CONVEYOR_SPEED: 1.1
} as const

export function cellZ(col: number): number {
  return (col - (CONFIG.COLS - 1) / 2) * CONFIG.BAY
}

export function storageBaseY(level: number): number {
  return CONFIG.FIRST_SHELF_BASE + level * CONFIG.LEVEL_H
}

export const SIDES = ['A', 'B'] as const
