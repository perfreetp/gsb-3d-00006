import * as THREE from 'three'
import { CONFIG } from './config'
import { PALETTE } from './materials'

import type { Side } from '../types'

export interface CraneRig {
  root: THREE.Group
  fork: THREE.Group
  setPose: (side: Side, z: number, liftY: number, forkExt: number) => void
}

export function buildCrane(scene: THREE.Scene): CraneRig {
  const root = new THREE.Group()

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.34, 1.05), PALETTE.steelDark)
  base.position.set(0, 0.35, 0)
  base.castShadow = true
  root.add(base)

  const baseWheelGeom = new THREE.CylinderGeometry(0.13, 0.13, 0.16, 16)
  baseWheelGeom.rotateX(Math.PI / 2)
  for (const sx of [-0.85, 0.85]) {
    for (const sz of [-0.42, 0.42]) {
      const w = new THREE.Mesh(baseWheelGeom, PALETTE.rail)
      w.position.set(sx, 0.14, sz)
      root.add(w)
    }
  }

  const mastGeom = new THREE.BoxGeometry(0.16, CONFIG.MAST_HEIGHT, 0.16)
  for (const sx of [-1.0, 1.0]) {
    for (const sz of [-0.52, 0.52]) {
      const mast = new THREE.Mesh(mastGeom, PALETTE.mast)
      mast.position.set(sx, CONFIG.MAST_HEIGHT / 2, sz)
      mast.castShadow = true
      root.add(mast)
    }
  }
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 0.26), PALETTE.mast)
  topBeam.position.set(0, CONFIG.MAST_HEIGHT, 0)
  root.add(topBeam)
  const topWheelGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.14, 14)
  topWheelGeom.rotateX(Math.PI / 2)
  for (const sz of [-0.4, 0.4]) {
    const w = new THREE.Mesh(topWheelGeom, PALETTE.rail)
    w.position.set(0, CONFIG.MAST_HEIGHT - 0.16, sz)
    root.add(w)
  }

  const carriage = new THREE.Group()
  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 0.95), PALETTE.carriage)
  platform.castShadow = true
  carriage.add(platform)
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 0.95), PALETTE.carriage)
  backPlate.position.set(-0.6, 0.45, 0)
  carriage.add(backPlate)
  root.add(carriage)

  const forkOrigin = new THREE.Group()
  const forkBase = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.07, 0.8), PALETTE.fork)
  forkBase.position.set(0.55, 0, 0)
  forkOrigin.add(forkBase)

  const tineGeom = new THREE.BoxGeometry(0.6, 0.06, 0.12)
  for (const z of [-0.3, 0.3]) {
    const tine = new THREE.Mesh(tineGeom, PALETTE.fork)
    tine.position.set(0.4, -0.01, z)
    tine.castShadow = true
    forkOrigin.add(tine)
  }
  forkOrigin.position.set(0.55, 0.02, 0)
  carriage.add(forkOrigin)

  const beaconPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8),
    PALETTE.steel
  )
  beaconPole.position.set(-1.0, CONFIG.MAST_HEIGHT + 0.15, 0)
  root.add(beaconPole)
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 1.4 })
  )
  beacon.position.set(-1.0, CONFIG.MAST_HEIGHT + 0.32, 0)
  root.add(beacon)

  scene.add(root)

  return {
    root,
    fork: forkOrigin,
    setPose(side, z, liftY, forkExt) {
      root.position.set(0, 0, z)
      root.rotation.y = side === 'A' ? 0 : Math.PI
      carriage.position.set(0, liftY, 0)
      forkOrigin.position.set(0.55 + forkExt, 0.02, 0)
    }
  }
}
