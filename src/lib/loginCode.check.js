import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CODE_ALPHABET,
  CODE_PATTERN,
  generateCode,
  generatePassword,
  normalizeCode,
} from './loginCode.js'

test('normalizeCode: huruf besar dan tanpa spasi tepi', () => {
  assert.equal(normalizeCode('  k7m2q9xa '), 'K7M2Q9XA')
  assert.equal(normalizeCode(undefined), '')
})

test('kode acak: panjang, huruf yang dipakai, dan lolos pola', () => {
  for (let i = 0; i < 200; i++) {
    const code = generateCode()
    assert.equal(code.length, 8)
    assert.ok(
      [...code].every((c) => CODE_ALPHABET.includes(c)),
      code,
    )
    assert.match(code, CODE_PATTERN)
    assert.doesNotMatch(code, /[ILO01]/)
  }
  assert.equal(generateCode(12).length, 12)
})

test('kode acak tidak berulang dalam praktik', () => {
  const codes = new Set(Array.from({ length: 500 }, () => generateCode()))
  assert.equal(codes.size, 500)
})

test('pola kode', () => {
  assert.match('AB12', CODE_PATTERN)
  assert.doesNotMatch('AB1', CODE_PATTERN)
  assert.doesNotMatch('ab12', CODE_PATTERN)
  assert.doesNotMatch('AB-12', CODE_PATTERN)
  assert.doesNotMatch('A'.repeat(21), CODE_PATTERN)
})

test('generator memakai sumber acak yang disuntikkan, tanpa bias dari sisa pembagian', () => {
  // nilai 0 -> huruf pertama alfabet
  assert.equal(
    generateCode(3, (a) => a.fill(0)),
    'AAA',
  )
  // nilai di atas batas dibuang lalu diulang: 0xFFFFFFFF ditolak, 31 -> indeks 0 ('A')
  const queue = [0xffffffff, 31]
  assert.equal(
    generateCode(1, (a) => ((a[0] = queue.shift()), a)),
    'A',
  )
})

test('sandi sementara: panjang dan memuat huruf besar, kecil, dan angka', () => {
  for (let i = 0; i < 100; i++) {
    const password = generatePassword()
    assert.equal(password.length, 14)
    assert.match(password, /[A-Z]/)
    assert.match(password, /[a-z]/)
    assert.match(password, /[2-9]/)
    assert.doesNotMatch(password, /[ILOilo01]/)
  }
})
