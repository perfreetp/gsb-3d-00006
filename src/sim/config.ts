// 仓库布局与设备参数（单位：米 / 秒）
export const LEVELS = 5            // 货架层数
export const COLUMNS = 12          // 每侧货架列数
export const SLOT_W = 1.3          // 货位宽度(X)
export const SLOT_H = 1.15         // 货位层高(Y)
export const RACK_Z = 1.7          // 货架中心距巷道中心距离(Z)
export const RACK_X0 = 0           // 第 0 列中心 X 坐标
export const BASE_Y = 0.75         // 第 0 层托盘放置高度

export const STATION_X = -2.8      // 出入库口 X 坐标（巷道口）
export const IN_PORT_Z = 0.95      // 入库输送线 Z
export const OUT_PORT_Z = -0.95    // 出库输送线 Z
export const CONVEYOR_START_X = -10.5 // 输送线起点
export const CONVEYOR_Y = 0.55     // 输送线面高度

export const CRANE_SPEED_X = 4.5   // 堆垛机行走速度
export const CRANE_SPEED_Y = 2.2   // 载货台升降速度
export const FORK_SPEED = 2.8      // 货叉伸缩速度
export const CONVEYOR_SPEED = 1.4  // 输送线速度

export const PALLET_GAP = 1.35     // 输送线上托盘最小间距

export function slotX(column: number) { return RACK_X0 + column * SLOT_W }
export function slotY(level: number) { return BASE_Y + level * SLOT_H }
export function slotZ(side: 0 | 1) { return side === 0 ? -RACK_Z : RACK_Z }
