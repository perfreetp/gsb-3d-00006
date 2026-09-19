import * as THREE from 'three'
import { CONFIG, cellZ, storageBaseY } from './config'
import { PALETTE } from './materials'
import { makeTextSprite } from './labels'
import type { Side } from '../types'

export interface CellHit {
  side: Side
  level: number
  col: number
  mesh: THREE.Mesh
}

export interface ConveyorView {
  group: THREE.Group
  rollers: THREE.Mesh[]
  lampIn: THREE.Mesh
  lampOut: THREE.Mesh
}

export interface StaticScene {
  scene: THREE.Scene
  cellHits: CellHit[]
  hitMap: Map<string, CellHit>
  conveyors: { IN: ConveyorView; OUT: ConveyorView }
}

const POST_W = 0.1
const BEAM_H = 0.09
const BEAM_D = 0.14

export function buildScene(): StaticScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b101b)
  scene.fog = new THREE.Fog(0x0b101b, 30, 70)

  const hemi = new THREE.HemisphereLight(0x9db8ff, 0x1a2233, 0.55)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xffffff, 1.5)
  key.position.set(14, 24, 10)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -18
  key.shadow.camera.right = 18
  key.shadow.camera.top = 18
  key.shadow.camera.bottom = -18
  key.shadow.camera.far = 70
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x88aaff, 0.35)
  fill.position.set(-12, 10, -16)
  scene.add(fill)

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 46), PALETTE.floor)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  const grid = new THREE.GridHelper(60, 60, 0x2a3a55, 0x1c2738)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.6
  grid.position.y = 0.002
  scene.add(grid)

  addZone(scene, CONFIG.INBOUND_X, (CONFIG.STATION_Z + CONFIG.CONVEYOR_FAR_Z) / 2, 2.4, 4.4, 0x1d3a2f, 0x22c55e)
  addZone(scene, CONFIG.OUTBOUND_X, (CONFIG.STATION_Z + CONFIG.CONVEYOR_FAR_Z) / 2, 2.4, 4.4, 0x3a1d24, 0xef4444)
  addZone(scene, 0, 0, 2.6, CONFIG.RAIL_MAX_Z - CONFIG.RAIL_MIN_Z + 1, 0x152238, 0x3b82f6)

  const cellHits: CellHit[] = []
  const hitMap = new Map<string, CellHit>()
  for (const side of ['A', 'B'] as Side[]) {
    const hits = buildRack(scene, side)
    for (const h of hits) {
      cellHits.push(h)
      hitMap.set(`${h.side}-${h.level}-${h.col}`, h)
    }
  }

  const conveyors = {
    IN: buildConveyor(CONFIG.INBOUND_X, 0x22c55e),
    OUT: buildConveyor(CONFIG.OUTBOUND_X, 0xef4444)
  }
  scene.add(conveyors.IN.group, conveyors.OUT.group)

  const titleA = makeTextSprite('A 区货架', { fontSize: 56, background: 'rgba(37,99,235,0.85)', scale: 0.005 })
  titleA.position.set(CONFIG.STORAGE_X, CONFIG.MAST_HEIGHT + 0.9, 0)
  scene.add(titleA)
  const titleB = makeTextSprite('B 区货架', { fontSize: 56, background: 'rgba(124,58,237,0.85)', scale: 0.005 })
  titleB.position.set(-CONFIG.STORAGE_X, CONFIG.MAST_HEIGHT + 0.9, 0)
  scene.add(titleB)

  const lblIn = makeTextSprite('入库口', { fontSize: 52, background: 'rgba(34,197,94,0.9)', scale: 0.005 })
  lblIn.position.set(CONFIG.INBOUND_X, 1.6, CONFIG.CONVEYOR_FAR_Z - 0.9)
  scene.add(lblIn)
  const lblOut = makeTextSprite('出库口', { fontSize: 52, background: 'rgba(239,68,68,0.9)', scale: 0.005 })
  lblOut.position.set(CONFIG.OUTBOUND_X, 1.6, CONFIG.CONVEYOR_FAR_Z - 0.9)
  scene.add(lblOut)

  return { scene, cellHits, hitMap, conveyors }
}

function addZone(scene: THREE.Scene, x: number, z: number, w: number, d: number, color: number, edge: number) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
  )
  m.rotation.x = -Math.PI / 2
  m.position.set(x, 0.006, z)
  scene.add(m)
  const e = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, d)),
    new THREE.LineBasicMaterial({ color: edge })
  )
  e.rotation.x = -Math.PI / 2
  e.position.set(x, 0.012, z)
  scene.add(e)
}

function buildRack(scene: THREE.Scene, side: Side): CellHit[] {
  const sign = side === 'A' ? 1 : -1
  const group = new THREE.Group()
  const depth = CONFIG.RACK_DEPTH
  const xFace = sign * CONFIG.AISLE_FACE_X
  const height = storageBaseY(CONFIG.LEVELS - 1) + 0.55
  const zMin = cellZ(0) - CONFIG.BAY / 2
  const totalLen = CONFIG.COLS * CONFIG.BAY

  const postGeom = new THREE.BoxGeometry(POST_W, height, POST_W)
  const postMat = PALETTE.steelDark
  const posts = new THREE.InstancedMesh(postGeom, postMat, (CONFIG.COLS + 1) * 2)
  const m4 = new THREE.Matrix4()
  let idx = 0
  for (let c = 0; c <= CONFIG.COLS; c++) {
    const z = zMin + c * CONFIG.BAY
    for (const xOff of [0, depth]) {
      m4.makeTranslation(xFace + sign * xOff, height / 2, z)
      posts.setMatrixAt(idx++, m4)
    }
  }
  posts.castShadow = true
  group.add(posts)

  const beamGeom = new THREE.BoxGeometry(depth + POST_W, BEAM_H, BEAM_D)
  const beamMat = PALETTE.beam
  for (let lv = 0; lv < CONFIG.LEVELS; lv++) {
    const beams = new THREE.InstancedMesh(beamGeom, beamMat, CONFIG.COLS)
    const y = storageBaseY(lv) - 0.05
    for (let c = 0; c < CONFIG.COLS; c++) {
      m4.makeTranslation(xFace + sign * depth / 2, y, cellZ(c))
      beams.setMatrixAt(c, m4)
    }
    beams.castShadow = true
    group.add(beams)
  }

  const longBeamGeom = new THREE.BoxGeometry(BEAM_D, BEAM_H, totalLen)
  for (let lv = 0; lv <= CONFIG.LEVELS; lv++) {
    const y = lv === 0 ? 0.12 : storageBaseY(lv - 1) + CONFIG.LEVEL_H - 0.18
    for (const xOff of [0, depth]) {
      const beam = new THREE.Mesh(longBeamGeom, beamMat)
      beam.position.set(xFace + sign * xOff, y, 0)
      beam.castShadow = true
      group.add(beam)
    }
  }

  scene.add(group)

  const hits: CellHit[] = []
  const hitGeom = new THREE.BoxGeometry(depth * 0.86, CONFIG.LEVEL_H * 0.82, CONFIG.BAY * 0.82)
  for (let lv = 0; lv < CONFIG.LEVELS; lv++) {
    for (let c = 0; c < CONFIG.COLS; c++) {
      const mat = PALETTE.hit.clone()
      const mesh = new THREE.Mesh(hitGeom, mat)
      mesh.position.set(
        xFace + sign * depth / 2,
        storageBaseY(lv) + CONFIG.LEVEL_H / 2,
        cellZ(c)
      )
      mesh.userData.side = side
      mesh.userData.level = lv
      mesh.userData.col = c
      scene.add(mesh)
      hits.push({ side, level: lv, col: c, mesh })
    }
  }

  for (let c = 0; c < CONFIG.COLS; c += 2) {
    const sprite = makeTextSprite(String(c + 1), { fontSize: 40, scale: 0.0042 })
    sprite.position.set(xFace, 0.22, cellZ(c))
    scene.add(sprite)
  }
  for (let lv = 0; lv < CONFIG.LEVELS; lv++) {
    const sprite = makeTextSprite(String(lv + 1) + '层', { fontSize: 38, scale: 0.0042 })
    sprite.position.set(xFace + sign * depth + sign * 0.45, storageBaseY(lv) + 0.2, zMin - 0.55)
    scene.add(sprite)
  }

  return hits
}

function buildConveyor(x: number, accent: number): ConveyorView {
  const group = new THREE.Group()
  group.position.set(x, 0, 0)
  const len = Math.abs(CONFIG.CONVEYOR_FAR_Z - CONFIG.STATION_Z)
  const zc = (CONFIG.CONVEYOR_FAR_Z + CONFIG.STATION_Z) / 2
  const width = 1.3

  const frame = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, len), PALETTE.beltFrame)
  frame.position.set(0, CONFIG.CONVEYOR_Y - 0.2, zc)
  frame.castShadow = true
  frame.receiveShadow = true
  group.add(frame)

  const legs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.12, CONFIG.CONVEYOR_Y - 0.3, 0.12),
    PALETTE.steelDark,
    8
  )
  const m4 = new THREE.Matrix4()
  let i = 0
  for (const zOff of [-len / 2 + 0.25, len / 2 - 0.25]) {
    for (const xOff of [-width / 2 + 0.12, width / 2 - 0.12]) {
      m4.makeTranslation(xOff, (CONFIG.CONVEYOR_Y - 0.3) / 2, zc + zOff)
      legs.setMatrixAt(i++, m4)
    }
  }
  group.add(legs)

  const rollerGeom = new THREE.CylinderGeometry(0.07, 0.07, width - 0.16, 14)
  rollerGeom.rotateZ(Math.PI / 2)
  const rollers: THREE.Mesh[] = []
  const count = Math.floor(len / 0.32)
  for (let r = 0; r < count; r++) {
    const roller = new THREE.Mesh(rollerGeom, PALETTE.roller)
    roller.position.set(0, CONFIG.CONVEYOR_Y, CONFIG.CONVEYOR_FAR_Z + 0.25 + r * 0.32)
    roller.castShadow = true
    group.add(roller)
    rollers.push(roller)
  }

  const lampGeom = new THREE.SphereGeometry(0.11, 16, 12)
  const lampIn = new THREE.Mesh(
    lampGeom,
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.2 })
  )
  lampIn.position.set(0, CONFIG.CONVEYOR_Y + 0.65, CONFIG.STATION_Z + 0.35)
  group.add(lampIn)
  const lampOut = new THREE.Mesh(
    lampGeom,
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.2 })
  )
  lampOut.position.set(0, CONFIG.CONVEYOR_Y + 0.65, CONFIG.CONVEYOR_FAR_Z - 0.2)
  group.add(lampOut)

  return { group, rollers, lampIn, lampOut }
}
