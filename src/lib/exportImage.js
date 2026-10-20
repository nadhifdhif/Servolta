// Fungsi bantu khusus browser untuk menyalin / mengunduh gambar. Tidak diuji di Node.
import { layoutSpecCard } from './specs.js'

const FONT = (weight, size) =>
  `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membuat gambar'))), 'image/png'),
  )
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gambar tidak dapat dibaca'))
    img.src = url
  })
}

export async function svgToPngBlob(svg, scale = 2) {
  const m = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
  const canvas = document.createElement('canvas')
  canvas.width = Number(m[1]) * scale
  canvas.height = Number(m[2]) * scale
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvasToBlob(canvas)
}

// Clipboard hanya menerima PNG, jadi JPG/WebP/dll. diubah dulu.
export async function blobToPngBlob(blob) {
  if (blob.type === 'image/png') return blob
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || 1200
    canvas.height = img.naturalHeight || 800
    canvas.getContext('2d').drawImage(img, 0, 0)
    return await canvasToBlob(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function copyImage(blobPromise) {
  const blob = await blobPromise
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function openBlob(blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function drawSpecCard(product, specs, source) {
  const scale = 2
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = FONT(650, 16)
  const card = layoutSpecCard((t) => ctx.measureText(t).width, specs)
  const { width, height, head, pad, labelWidth, lineHeight, rowPad } = card

  canvas.width = width * scale
  canvas.height = height * scale
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#f5f5f2'
  ctx.fillRect(0, 0, width, head)
  ctx.fillStyle = '#d8d8d2'
  ctx.fillRect(0, head - 1, width, 1)
  ctx.fillStyle = '#1f4e8c'
  ctx.font = FONT(700, 14)
  ctx.fillText(product.sku, pad, 40)
  ctx.fillStyle = '#1f2328'
  ctx.font = FONT(700, 26)
  ctx.fillText(product.name, pad, 78)
  ctx.fillStyle = '#5f6770'
  ctx.font = FONT(400, 14)
  ctx.fillText('Spesifikasi ringkas', pad, 102)

  let y = head
  card.rows.forEach((row, i) => {
    if (i % 2) {
      ctx.fillStyle = '#faf9f7'
      ctx.fillRect(0, y, width, row.height)
    }
    ctx.fillStyle = '#5f6770'
    ctx.font = FONT(500, 16)
    ctx.fillText(row.label, pad, y + rowPad + 16)
    ctx.fillStyle = '#1f2328'
    ctx.font = FONT(650, 16)
    row.lines.forEach((line, j) =>
      ctx.fillText(line, pad + labelWidth, y + rowPad + 16 + j * lineHeight),
    )
    y += row.height
  })
  ctx.fillStyle = '#5f6770'
  ctx.font = FONT(500, 13)
  ctx.fillText(source, pad, y + 34)
  return canvas
}
