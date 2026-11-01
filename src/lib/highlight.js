// Pewarna sintaks sederhana untuk kode Arduino/C++. Semua teks di-escape, jadi aman untuk v-html.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (text) => text.replace(/[&<>"']/g, (c) => ESCAPES[c])

const KEYWORDS =
  'void|int|float|double|char|bool|const|unsigned|long|short|byte|if|else|for|while|do|return|true|false|' +
  'static|struct|class|new|delete|break|continue|switch|case|default|String|uint8_t|uint16_t|uint32_t|sensors_event_t'

const TOKEN = new RegExp(
  [
    '(\\/\\/[^\\n]*)', // 1 komentar
    '("(?:[^"\\\\\\n]|\\\\.)*")', // 2 string
    '(#\\w+)', // 3 preprosesor
    `(\\b(?:${KEYWORDS})\\b)`, // 4 kata kunci
    '(\\b0x[0-9a-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?\\b)', // 5 angka
  ].join('|'),
  'g',
)

const CLASSES = [null, 'tk-comment', 'tk-string', 'tk-pre', 'tk-key', 'tk-num']

export function highlight(code) {
  let out = ''
  let last = 0
  for (const match of code.matchAll(TOKEN)) {
    out += esc(code.slice(last, match.index))
    const group = match.findIndex((value, i) => i > 0 && value !== undefined)
    out += `<span class="${CLASSES[group]}">${esc(match[0])}</span>`
    last = match.index + match[0].length
  }
  return out + esc(code.slice(last))
}
