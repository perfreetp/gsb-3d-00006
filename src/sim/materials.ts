import * as THREE from 'three'

export const PALETTE = {
  steel: new THREE.MeshStandardMaterial({ color: 0x5b6b7f, roughness: 0.6, metalness: 0.55 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x33404f, roughness: 0.65, metalness: 0.6 }),
  mast: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45, metalness: 0.35 }),
  carriage: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4, metalness: 0.4 }),
  fork: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.7 }),
  beam: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.4 }),
  roller: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.8 }),
  beltFrame: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.3 }),
  rail: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.7 }),
  pallet: new THREE.MeshStandardMaterial({ color: 0xb07a3b, roughness: 0.85 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x141b29, roughness: 0.95 }),
  hit: new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0,
    depthWrite: false
  })
}

export const CARGO_TYPES: { name: string; color: number }[] = [
  { name: '电子元件', color: 0xef4444 },
  { name: '汽车配件', color: 0x3b82f6 },
  { name: '食品饮料', color: 0x22c55e },
  { name: '医药物资', color: 0xa855f7 },
  { name: '服装纺织', color: 0xec4899 },
  { name: '日用百货', color: 0xf59e0b },
  { name: '机械零件', color: 0x14b8a6 },
  { name: '化工原料', color: 0x84cc16 }
]

export function cargoMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08 })
}
