import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SNIPPETS, findSnippet } from './snippets.js'

test('id unik dan bisa dicari', () => {
  const ids = SNIPPETS.map((s) => s.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(findSnippet('dht22').name, 'DHT22')
  assert.equal(findSnippet('tidak-ada'), null)
})

test('setiap contoh lengkap: info, pustaka, pengkabelan, kode', () => {
  for (const s of SNIPPETS) {
    assert.ok(s.name && s.kind && s.summary, s.id)
    assert.ok(s.boards.length > 0, s.id)
    assert.ok(s.libraries.length > 0, s.id)
    assert.ok(s.wiring.length >= 3 && s.wiring.every((w) => w.pin && w.esp32 && w.uno), s.id)
    assert.ok(Array.isArray(s.notes) && Array.isArray(s.warnings), s.id)
  }
})

test('kode punya setup() dan loop(), kurung seimbang', () => {
  for (const s of SNIPPETS) {
    assert.match(s.code, /void setup\(\)/, s.id)
    assert.match(s.code, /void loop\(\)/, s.id)
    // buang string dan komentar dulu supaya tanda kurung di dalamnya tidak ikut dihitung
    const code = s.code.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/\/\/.*$/gm, '')
    for (const [open, close] of [
      ['{', '}'],
      ['(', ')'],
    ]) {
      assert.equal(code.split(open).length, code.split(close).length, `${s.id}: ${open}${close}`)
    }
  }
})

test('setiap #include punya pustaka yang tercantum', () => {
  const expected = {
    'DHT.h': 'DHT sensor library',
    'PZEM004Tv30.h': 'PZEM004Tv30',
    'Adafruit_SSD1306.h': 'Adafruit SSD1306',
    'Adafruit_GFX.h': 'Adafruit GFX Library',
    'Adafruit_MPU6050.h': 'Adafruit MPU6050',
    'Adafruit_Sensor.h': 'Adafruit Unified Sensor',
  }
  for (const s of SNIPPETS) {
    for (const [, header] of s.code.matchAll(/#include <([^>]+)>/g)) {
      if (header === 'Wire.h') continue
      assert.ok(expected[header], `${s.id}: header tidak dikenal ${header}`)
      assert.ok(
        s.libraries.some((l) => l.name === expected[header]),
        `${s.id}: pustaka ${expected[header]} belum tercantum`,
      )
    }
  }
})

test('contoh PZEM memperingatkan tegangan PLN', () => {
  assert.ok(findSnippet('pzem004t').warnings.some((w) => /PLN/.test(w)))
})
