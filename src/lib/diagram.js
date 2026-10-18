// Gambar wiring contoh dibuat dari data (bukan foto), agar bisa disalin dan diunduh sebagai PNG.
export const WIRES = {
  L: { color: '#b9803f', label: 'L: fasa (coklat)' },
  N: { color: '#3b82f6', label: 'N: netral (biru)' },
  PE: { color: '#4caf50', stripe: '#e6d12a', label: 'PE: arde (hijau-kuning)' },
  POS: { color: '#e5484d', label: '+12 V (merah)' },
  NEG: { color: '#16203a', label: '−12 V (hitam)' },
  DATA: { color: '#2a52e6', label: 'Data (UTP / BNC)' },
}

const NODE_W = 140
const NODE_H = 78
const GAP = 100
const PAD = 26
const TOP = 44
const HEIGHT = 176

// diagram.links[i] = [...kunciKabel, label] untuk sambungan antara node i dan i + 1.
export function layoutDiagram(diagram) {
  const count = diagram.nodes.length
  const width = PAD * 2 + count * NODE_W + (count - 1) * GAP
  const nodes = diagram.nodes.map(([title, sub], i) => ({
    title,
    sub,
    x: PAD + i * (NODE_W + GAP),
    y: TOP,
    w: NODE_W,
    h: NODE_H,
  }))
  const links = diagram.links.slice(0, Math.max(0, count - 1)).map((link, i) => {
    const keys = link.slice(0, -1).filter((k) => WIRES[k])
    const x1 = PAD + i * (NODE_W + GAP) + NODE_W
    const x2 = x1 + GAP
    const cy = TOP + NODE_H / 2
    return {
      label: link[link.length - 1],
      lx: (x1 + x2) / 2,
      ly: TOP + NODE_H + 30,
      wires: keys.map((key, j) => ({
        key,
        x1,
        x2,
        y: cy + (j - (keys.length - 1) / 2) * 11,
        color: WIRES[key].color,
        stripe: WIRES[key].stripe ?? null,
      })),
    }
  })
  return { width, height: HEIGHT, nodes, links }
}

export function usedWires(diagram) {
  const keys = new Set()
  for (const link of diagram.links) link.slice(0, -1).forEach((k) => WIRES[k] && keys.add(k))
  return [...keys].map((key) => ({ key, ...WIRES[key] }))
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c])

// Semua teks di-escape, jadi aman dipakai dengan v-html maupun diubah menjadi PNG.
export function diagramSvg(diagram, title = 'wiring') {
  const { width, height, nodes, links } = layoutDiagram(diagram)
  const font = 'font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif"'
  let body = `<rect width="${width}" height="${height}" fill="#ffffff"/>`
  for (const n of nodes) {
    const cx = n.x + n.w / 2
    body += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="12" fill="#ffffff" stroke="#c9d2e5" stroke-width="1.5"/>`
    body += `<text x="${cx}" y="${n.y + 34}" text-anchor="middle" fill="#16203a" ${font} font-size="14" font-weight="700">${esc(n.title)}</text>`
    body += `<text x="${cx}" y="${n.y + 54}" text-anchor="middle" fill="#5b6684" ${font} font-size="11.5" font-weight="500">${esc(n.sub)}</text>`
  }
  for (const link of links) {
    for (const w of link.wires) {
      body += `<line x1="${w.x1}" y1="${w.y}" x2="${w.x2}" y2="${w.y}" stroke="${w.color}" stroke-width="4" stroke-linecap="round"/>`
      if (w.stripe) {
        body += `<line x1="${w.x1}" y1="${w.y}" x2="${w.x2}" y2="${w.y}" stroke="${w.stripe}" stroke-width="4" stroke-dasharray="7 7"/>`
      }
      for (const x of [w.x1, w.x2]) {
        body += `<circle cx="${x}" cy="${w.y}" r="3.5" fill="#ffffff" stroke="${w.color}" stroke-width="2"/>`
      }
    }
    body += `<text x="${link.lx}" y="${link.ly}" text-anchor="middle" fill="#5b6684" ${font} font-size="11" font-weight="600">${esc(link.label)}</text>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Gambar wiring ${esc(title)}">${body}</svg>`
}
