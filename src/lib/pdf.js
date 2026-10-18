// PDF sangat sederhana (teks saja) untuk data contoh; PDF resmi berasal dari unggahan.
const REPLACEMENTS = { '–': '-', '—': '-', '−': '-', '•': '-', '’': "'", '“': '"', '”': '"' }

function clean(text) {
  return String(text)
    .replace(/[–—−•’“”]/g, (c) => REPLACEMENTS[c])
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
}
const escapePdf = (text) => text.replace(/[\\()]/g, '\\$&')

function wrap(line, max) {
  const out = []
  let current = ''
  for (const word of line.split(' ')) {
    const attempt = current ? `${current} ${word}` : word
    if (current && attempt.length > max) {
      out.push(current)
      current = word
    } else current = attempt
  }
  out.push(current)
  return out
}

export function makeSimplePdf(title, lines) {
  const body = lines.flatMap((l) => wrap(clean(l), 92))
  const perPage = 44
  const pages = []
  for (let i = 0; i < body.length; i += perPage) pages.push(body.slice(i, i + perPage))
  if (!pages.length) pages.push([])

  const firstPage = 5
  const objects = []
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${firstPage + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objects[4] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'

  pages.forEach((chunk, i) => {
    let y = 790
    let stream = 'BT\n'
    if (i === 0) {
      stream += `/F2 16 Tf 1 0 0 1 50 ${y} Tm (${escapePdf(clean(title))}) Tj\n`
      y -= 34
    }
    stream += '/F1 11 Tf\n'
    for (const line of chunk) {
      stream += `1 0 0 1 50 ${y} Tm (${escapePdf(line)}) Tj\n`
      y -= 16
    }
    stream += 'ET'
    const pageId = firstPage + i * 2
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`
    objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })

  let out = '%PDF-1.4\n'
  const offsets = []
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = out.length
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xrefAt = out.length
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id++) {
    out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`
  return Uint8Array.from(out, (c) => c.charCodeAt(0))
}
