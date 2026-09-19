import * as THREE from 'three'

export function makeTextSprite(text: string, opts?: {
  fontSize?: number
  color?: string
  background?: string
  scale?: number
}): THREE.Sprite {
  const fontSize = opts?.fontSize ?? 48
  const color = opts?.color ?? '#e2e8f0'
  const pad = 14
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2
  const h = fontSize + pad * 2
  canvas.width = w
  canvas.height = h
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`
  if (opts?.background) {
    ctx.fillStyle = opts.background
    ctx.beginPath()
    ctx.roundRect(0, 0, w, h, 12)
    ctx.fill()
  }
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, w / 2, h / 2 + 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 4
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  const s = opts?.scale ?? 0.006
  sprite.scale.set(w * s, h * s, 1)
  sprite.renderOrder = 999
  return sprite
}
