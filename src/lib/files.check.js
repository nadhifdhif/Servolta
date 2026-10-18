import assert from 'node:assert/strict'
import { test } from 'node:test'
import { diagramSvg, layoutDiagram, usedWires } from './diagram.js'
import { formatDate, formatSize, validateUpload } from './files.js'
import { makeSimplePdf } from './pdf.js'
import { layoutSpecCard, specsToText, wrapText } from './specs.js'

const file = (name, size = 1000) => ({ name, size })

test('validateUpload wiring: format dan ukuran', () => {
  for (const n of ['a.jpg', 'a.JPEG', 'a.png', 'a.svg', 'iphone.HEIC', 'a.webp']) {
    assert.equal(validateUpload('wiring', file(n)), null, n)
  }
  assert.match(validateUpload('wiring', file('a.pdf')), /belum didukung/)
  assert.match(validateUpload('wiring', file('a.png', 16 * 1024 * 1024)), /15 MB/)
  assert.match(validateUpload('wiring', file('a.png', 0)), /kosong/)
  assert.match(validateUpload('wiring', null), /Pilih file/)
  assert.match(validateUpload('wiring', file('tanpa-ekstensi')), /belum didukung/)
})

test('validateUpload datasheet: hanya PDF', () => {
  assert.equal(validateUpload('datasheet', file('ds.pdf')), null)
  assert.equal(validateUpload('datasheet', file('DS.PDF')), null)
  assert.match(validateUpload('datasheet', file('ds.docx')), /PDF/)
  assert.match(validateUpload('datasheet', file('ds.pdf', 21 * 1024 * 1024)), /20 MB/)
})

test('formatSize dan formatDate', () => {
  assert.equal(formatSize(420 * 1024), '420 KB')
  assert.equal(formatSize(1.5 * 1024 * 1024), '1,5 MB')
  assert.equal(formatSize(10), '1 KB')
  assert.equal(formatSize(NaN), '')
  assert.equal(formatDate('2026-09-12'), '12 Sep 2026')
  assert.equal(formatDate('2026-10-01T09:00:00Z'), '1 Okt 2026')
  assert.equal(formatDate('rusak'), '')
  assert.equal(formatDate(undefined), '')
})

const diagram = {
  nodes: [
    ['PLN', '220 VAC'],
    ['Stabilizer', 'IN → OUT'],
    ['Beban', '<script>'],
  ],
  links: [
    ['L', 'N', 'PE', '3 × 1,5 mm²'],
    ['L', 'N', 'PE', 'x'],
  ],
}

test('layoutDiagram: ukuran, jumlah kabel, node & sambungan', () => {
  const l = layoutDiagram(diagram)
  assert.equal(l.nodes.length, 3)
  assert.equal(l.links.length, 2)
  assert.equal(l.width, 26 * 2 + 3 * 140 + 2 * 100)
  assert.equal(l.links[0].wires.length, 3)
  assert.ok(l.links[0].wires.every((w) => w.x2 > w.x1))
  assert.equal(l.links[0].wires.find((w) => w.key === 'PE').stripe, '#e6d12a')
})

test('layoutDiagram mengabaikan kunci kabel tak dikenal dan sambungan berlebih', () => {
  const l = layoutDiagram({
    nodes: [
      ['A', 'a'],
      ['B', 'b'],
    ],
    links: [
      ['L', 'ZZZ', 'x'],
      ['N', 'y'],
    ],
  })
  assert.equal(l.links.length, 1)
  assert.deepEqual(
    l.links[0].wires.map((w) => w.key),
    ['L'],
  )
})

test('usedWires unik', () => {
  assert.deepEqual(
    usedWires(diagram).map((w) => w.key),
    ['L', 'N', 'PE'],
  )
})

test('diagramSvg meng-escape teks (aman untuk v-html)', () => {
  const svg = diagramSvg(diagram, '"><img src=x onerror=alert(1)>')
  assert.ok(svg.startsWith('<svg'))
  assert.ok(!svg.includes('<script>'))
  assert.ok(!svg.includes('<img'))
  assert.ok(svg.includes('&lt;script&gt;'))
  assert.match(svg, /viewBox="0 0 \d+ 176"/)
})

test('wrapText dan layoutSpecCard', () => {
  const measure = (t) => t.length * 10
  assert.deepEqual(wrapText(measure, 'aa bb cc dd', 50), ['aa bb', 'cc dd'])
  assert.deepEqual(wrapText(measure, '', 50), [])
  const card = layoutSpecCard(measure, [
    ['Berat', '9 kg'],
    ['Proteksi', 'kata '.repeat(40).trim()],
  ])
  assert.equal(card.rows.length, 2)
  assert.ok(card.rows[1].lines.length > 1)
  assert.equal(card.height, 118 + card.rows[0].height + card.rows[1].height + 56)
})

test('specsToText', () => {
  assert.equal(
    specsToText({ name: 'Router', sku: 'R-1' }, [['Port', '4 LAN']]),
    'Router (R-1)\n• Port: 4 LAN',
  )
})

test('makeSimplePdf menghasilkan PDF valid (xref menunjuk objek yang benar)', () => {
  const bytes = makeSimplePdf(
    'Datasheet (SVR-1000) – Rev 3',
    Array.from({ length: 100 }, (_, i) => `Baris ${i} (a\\b) × ±`),
  )
  const text = Buffer.from(bytes).toString('latin1')
  assert.ok(text.startsWith('%PDF-1.4'))
  assert.ok(text.endsWith('%%EOF'))
  const xrefAt = Number(/startxref\n(\d+)\n%%EOF$/.exec(text)[1])
  assert.equal(text.slice(xrefAt, xrefAt + 4), 'xref')
  const entries = [...text.slice(xrefAt).matchAll(/^(\d{10}) 00000 n $/gm)]
  assert.ok(entries.length >= 7)
  entries.forEach((m, i) => {
    assert.ok(text.slice(Number(m[1])).startsWith(`${i + 1} 0 obj`), `objek ${i + 1}`)
  })
  assert.match(text, /\/Count 3 /)
})
