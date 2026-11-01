import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SNIPPETS } from '../data/snippets.js'
import { highlight } from './highlight.js'

const plain = (html) =>
  html
    .replace(/<span class="tk-[a-z]+">|<\/span>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

test('semua contoh kode kembali utuh setelah tag dibuang', () => {
  for (const s of SNIPPETS) assert.equal(plain(highlight(s.code)), s.code, s.id)
})

test('karakter HTML di-escape, tidak ada tag asing yang lolos', () => {
  const html = highlight('#include <DHT.h>\n// <b>tebal</b> & lain\nString a = "<i>x</i>";')
  assert.ok(!/<(?!\/?span\b)[a-z]/i.test(html), html)
  assert.ok(html.includes('&lt;DHT.h&gt;'))
  assert.ok(html.includes('&amp;'))
})

test('token dikenali: komentar, string, preprosesor, kata kunci, angka', () => {
  const html = highlight('#define PIN 4\nvoid setup() { x = "a"; y = 0x3C; } // selesai')
  assert.match(html, /<span class="tk-pre">#define<\/span>/)
  assert.match(html, /<span class="tk-key">void<\/span>/)
  assert.match(html, /<span class="tk-string">&quot;a&quot;<\/span>/)
  assert.match(html, /<span class="tk-num">0x3C<\/span>/)
  assert.match(html, /<span class="tk-num">4<\/span>/)
  assert.match(html, /<span class="tk-comment">\/\/ selesai<\/span>/)
})

test('kata kunci di dalam kata lain atau string tidak diwarnai ganda', () => {
  const html = highlight('int integer = 1; // int di komentar')
  assert.equal((html.match(/tk-key/g) || []).length, 1)
  assert.ok(html.includes('integer'))
})
