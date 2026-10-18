export function specsToText(product, specs) {
  return `${product.name} (${product.sku})\n` + specs.map(([k, v]) => `• ${k}: ${v}`).join('\n')
}

// Memecah teks ke beberapa baris sesuai lebar; `measure(teks)` mengembalikan lebar piksel.
export function wrapText(measure, text, maxWidth) {
  const lines = []
  let current = ''
  for (const word of String(text).split(' ')) {
    const attempt = current ? `${current} ${word}` : word
    if (current && measure(attempt) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = attempt
    }
  }
  if (current) lines.push(current)
  return lines
}

// Tata letak kartu spesifikasi (dipakai untuk digambar ke canvas dan diuji tanpa browser).
export function layoutSpecCard(measure, specs, o = {}) {
  const { width = 760, pad = 36, labelWidth = 240, lineHeight = 22, rowPad = 14 } = o
  const head = 118
  const foot = 56
  const rows = specs.map(([label, value]) => {
    const lines = wrapText(measure, value, width - pad * 2 - labelWidth)
    return { label, lines, height: lines.length * lineHeight + rowPad * 2 }
  })
  const height = head + rows.reduce((sum, r) => sum + r.height, 0) + foot
  return { width, height, head, pad, labelWidth, lineHeight, rowPad, rows }
}
