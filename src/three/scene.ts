import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  LEVELS, COLUMNS, SLOT_W, SLOT_H, RACK_Z, BASE_Y,
  STATION_X, IN_PORT_Z, OUT_PORT_Z, CONVEYOR_START_X, CONVEYOR_Y,
  slotX, slotY, slotZ
} from '../sim/config'
import { Simulation, ui } from '../sim/simulation'
import { SlotCoord, slotKey } from '../sim/types'

const EMPTY_COLOR = new THREE.Color(0x2e8b57)
const FULL_COLOR = new THREE.Color(0xd2691e)
const SELECT_COLOR = new THREE.Color(0x00e5ff)

export function createScene(container: HTMLElement, sim: Simulation) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x10141c)
  scene.fog = new THREE.Fog(0x10141c, 30, 80)

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(16, 13, 18)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(2, 2.2, 0)
  controls.maxPolarAngle = Math.PI / 2 - 0.05
  controls.minDistance = 5
  controls.maxDistance = 60
  controls.enableDamping = true

  // 灯光
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x30281e, 0.9))
  const sun = new THREE.DirectionalLight(0xffffff, 1.4)
  sun.position.set(12, 20, 10)
  sun.castShadow = true
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20
  sun.shadow.mapSize.set(2048, 2048)
  scene.add(sun)

  // 地面
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 30),
    new THREE.MeshStandardMaterial({ color: 0x232a36, roughness: 0.9 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  const grid = new THREE.GridHelper(60, 60, 0x3a4356, 0x2a3242)
  grid.position.y = 0.01
  scene.add(grid)

  // ---------------- 货架 ----------------
  const rackGroup = new THREE.Group()
  const uprightMat = new THREE.MeshStandardMaterial({ color: 0x5b6b7f, roughness: 0.6, metalness: 0.4 })
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x3f6fa5, roughness: 0.5, metalness: 0.3 })
  const totalH = BASE_Y + (LEVELS - 1) * SLOT_H + 0.6
  const rackLen = COLUMNS * SLOT_W
  const rackCenterX = slotX(0) - SLOT_W / 2 + rackLen / 2

  for (const side of [0, 1] as const) {
    const z = slotZ(side)
    // 立柱
    for (let c = 0; c <= COLUMNS; c++) {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.12, totalH, 0.5), uprightMat)
      upright.position.set(slotX(0) - SLOT_W / 2 + c * SLOT_W, totalH / 2, z)
      upright.castShadow = true
      rackGroup.add(upright)
    }
    // 横梁（每层）
    for (let l = 0; l < LEVELS; l++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(rackLen, 0.09, 0.9), beamMat)
      beam.position.set(rackCenterX, slotY(l) - 0.1, z)
      beam.castShadow = true
      rackGroup.add(beam)
    }
    // 顶部连接梁
    const top = new THREE.Mesh(new THREE.BoxGeometry(rackLen, 0.1, 0.5), uprightMat)
    top.position.set(rackCenterX, totalH, z)
    rackGroup.add(top)
  }
  scene.add(rackGroup)

  // ---------------- 货位指示块（可点击） ----------------
  const slotMeshes = new Map<string, THREE.Mesh>()
  const slotGeo = new THREE.BoxGeometry(SLOT_W * 0.86, 0.06, 0.95)
  for (const side of [0, 1] as const) {
    for (let c = 0; c < COLUMNS; c++) {
      for (let l = 0; l < LEVELS; l++) {
        const coord: SlotCoord = { side, column: c, level: l }
        const mat = new THREE.MeshStandardMaterial({
          color: EMPTY_COLOR, transparent: true, opacity: 0.55,
          emissive: 0x000000
        })
        const mesh = new THREE.Mesh(slotGeo, mat)
        mesh.position.set(slotX(c), slotY(l) - 0.04, slotZ(side))
        mesh.userData.coord = coord
        scene.add(mesh)
        slotMeshes.set(slotKey(coord), mesh)
      }
    }
  }

  // ---------------- 堆垛机 ----------------
  const craneGroup = new THREE.Group()
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xf2a541, roughness: 0.4, metalness: 0.5 })
  const craneDark = new THREE.MeshStandardMaterial({ color: 0x8c5a13, roughness: 0.5, metalness: 0.5 })

  // 地轨
  const railLen = rackLen + 6
  const rail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.12, 0.3), craneDark)
  rail.position.set(rackCenterX - 1.5, 0.06, 0)
  scene.add(rail)
  // 天轨
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.1, 0.2), craneDark)
  topRail.position.set(rackCenterX - 1.5, totalH + 0.3, 0)
  scene.add(topRail)

  // 底座
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 1.1), craneMat)
  base.position.y = 0.3
  base.castShadow = true
  craneGroup.add(base)
  // 立柱（双柱）
  for (const dz of [-0.35, 0.35]) {
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.22, totalH + 0.3, 0.22), craneMat)
    mast.position.set(0, (totalH + 0.3) / 2 + 0.3, dz)
    mast.castShadow = true
    craneGroup.add(mast)
  }
  // 载货台
  const carriage = new THREE.Group()
  const carPlate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 1.0), craneDark)
  carPlate.castShadow = true
  carriage.add(carPlate)
  // 货叉（几何中心在原点，Z 方向缩放实现伸缩）
  const forkGeo = new THREE.BoxGeometry(0.45, 0.06, 1.8)
  const forkMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7, roughness: 0.3 })
  const fork = new THREE.Mesh(forkGeo, forkMat)
  fork.position.y = 0.06
  carriage.add(fork)
  craneGroup.add(carriage)
  scene.add(craneGroup)

  // ---------------- 输送线 ----------------
  const convLen = STATION_X - CONVEYOR_START_X
  const convCenterX = (STATION_X + CONVEYOR_START_X) / 2
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x37414f, roughness: 0.8 })
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.5, metalness: 0.3 })
  const frameMatOut = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5, metalness: 0.3 })

  function buildConveyor(z: number, mat: THREE.Material) {
    const g = new THREE.Group()
    const belt = new THREE.Mesh(new THREE.BoxGeometry(convLen, 0.08, 0.9), beltMat)
    belt.position.set(convCenterX, CONVEYOR_Y - 0.04, z)
    g.add(belt)
    for (const dz of [-0.5, 0.5]) {
      const sideBar = new THREE.Mesh(new THREE.BoxGeometry(convLen, 0.14, 0.06), mat)
      sideBar.position.set(convCenterX, CONVEYOR_Y, z + dz * 0.9)
      g.add(sideBar)
    }
    // 支腿
    for (let i = 0; i <= 4; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, CONVEYOR_Y - 0.08, 0.8), mat)
      leg.position.set(CONVEYOR_START_X + (convLen / 4) * i, (CONVEYOR_Y - 0.08) / 2, z)
      g.add(leg)
    }
    // 滚筒
    const rollerGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 10)
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0x9aa5b1, metalness: 0.6, roughness: 0.4 })
    for (let i = 0; i < 14; i++) {
      const roller = new THREE.Mesh(rollerGeo, rollerMat)
      roller.rotation.x = Math.PI / 2
      roller.position.set(CONVEYOR_START_X + 0.4 + (convLen - 0.8) * (i / 13), CONVEYOR_Y, z)
      g.add(roller)
    }
    scene.add(g)
  }
  buildConveyor(IN_PORT_Z, frameMat)   // 入库线（绿）
  buildConveyor(OUT_PORT_Z, frameMatOut) // 出库线（红）

  // 出入库口标识牌
  function buildSign(x: number, z: number, color: number) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), frameMat)
    post.position.set(x, 0.8, z)
    scene.add(post)
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.4, 0.06),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 })
    )
    board.position.set(x, 1.7, z)
    scene.add(board)
  }
  buildSign(STATION_X, IN_PORT_Z + 0.8, 0x2ecc71)
  buildSign(STATION_X, OUT_PORT_Z - 0.8, 0xe74c3c)

  // ---------------- 托盘 ----------------
  const palletBaseGeo = new THREE.BoxGeometry(1.05, 0.12, 0.95)
  const palletBaseMat = new THREE.MeshStandardMaterial({ color: 0xa9803e, roughness: 0.8 })
  const goodsGeo = new THREE.BoxGeometry(0.85, 0.62, 0.75)
  const palletMeshes = new Map<number, THREE.Group>()

  function getPalletMesh(id: number, color: number): THREE.Group {
    let g = palletMeshes.get(id)
    if (!g) {
      g = new THREE.Group()
      const base = new THREE.Mesh(palletBaseGeo, palletBaseMat)
      base.position.y = 0.06
      base.castShadow = true
      g.add(base)
      const goods = new THREE.Mesh(goodsGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }))
      goods.position.y = 0.12 + 0.31
      goods.castShadow = true
      g.add(goods)
      palletMeshes.set(id, g)
      scene.add(g)
    }
    return g
  }

  // ---------------- 点击拾取 ----------------
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let downX = 0, downY = 0
  renderer.domElement.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY })
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return // 拖拽不算点击
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects([...slotMeshes.values()], false)
    if (hits.length) {
      sim.selectSlot(hits[0].object.userData.coord as SlotCoord)
    } else {
      sim.selectSlot(null)
    }
  })

  // ---------------- 同步与渲染循环 ----------------
  const clock = new THREE.Clock()

  function syncVisuals() {
    // 堆垛机
    craneGroup.position.x = sim.crane.x
    carriage.position.y = sim.crane.y
    const fz = sim.crane.forkZ
    fork.scale.z = Math.max(Math.abs(fz), 0.06) / 1.8
    fork.position.z = fz / 2

    // 托盘
    const seen = new Set<number>()
    for (const p of sim.pallets.values()) {
      if (p.loc === 'conveyor' && p.dir === 'in' && p.x < CONVEYOR_START_X) continue // 未上线
      seen.add(p.id)
      const g = getPalletMesh(p.id, p.color)
      g.position.set(p.x, p.y, p.z)
    }
    for (const [id, g] of palletMeshes) {
      if (!seen.has(id)) {
        scene.remove(g)
        palletMeshes.delete(id)
      }
    }

    // 货位占用着色
    for (const [key, mesh] of slotMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial
      const occupied = sim.slots.has(key)
      const selected = ui.selected && slotKey(ui.selected.coord) === key
      if (selected) {
        mat.color.copy(SELECT_COLOR)
        mat.emissive.setHex(0x00607a)
        mat.opacity = 0.95
      } else {
        mat.color.copy(occupied ? FULL_COLOR : EMPTY_COLOR)
        mat.emissive.setHex(0x000000)
        mat.opacity = occupied ? 0.85 : 0.45
      }
    }
  }

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)

  function tick() {
    requestAnimationFrame(tick)
    const dt = Math.min(clock.getDelta(), 0.05)
    sim.update(ui.paused ? 0 : dt * ui.speed)
    syncVisuals()
    controls.update()
    renderer.render(scene, camera)
  }
  tick()
}
