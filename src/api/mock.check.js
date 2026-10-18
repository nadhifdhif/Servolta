import assert from 'node:assert/strict'
import { test } from 'node:test'

// Node tidak punya localStorage: sediakan penyimpanan sederhana sebelum modul mock dimuat.
const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
}

const mock = await import('./mock.js')
const { tokenStorage } = await import('./token.js')
const { MOCK_ACCOUNTS } = await import('./mockAccounts.js')
const { ROLES } = await import('../lib/roles.js')
mock.setMockDelay(0)

async function loginAs(email) {
  const result = await mock.login(email, 'password')
  tokenStorage.set(result.token)
  return result
}

async function rejects(promise, status) {
  await assert.rejects(promise, (error) => error.name === 'ApiError' && error.status === status)
}

test('setiap role punya satu akun {role}@servolta.test (sama dengan seeder backend)', () => {
  for (const role of ROLES) {
    assert.ok(MOCK_ACCOUNTS.some((a) => a.role === role && a.email === `${role}@servolta.test`))
  }
})

test('login berhasil mengembalikan token dan user tanpa kata sandi', async () => {
  const result = await mock.login('spv@servolta.test', 'password')
  assert.ok(result.token.startsWith('mock.'))
  assert.equal(result.user.role, 'spv')
  assert.equal(result.user.permissions.manage_users, true)
  assert.ok(!('password' in result.user))
})

test('email tidak peka huruf besar/kecil dan spasi', async () => {
  const result = await mock.login('  CS@Servolta.test ', 'password')
  assert.equal(result.user.role, 'cs')
})

test('kata sandi salah ditolak dengan 422', async () => {
  await rejects(mock.login('cs@servolta.test', 'salah'), 422)
})

test('akun nonaktif ditolak dengan pesan khusus', async () => {
  await assert.rejects(mock.login('nonaktif@servolta.test', 'password'), (error) => {
    return error.status === 422 && error.errors.email[0].includes('dinonaktifkan')
  })
})

test('me() tanpa token ditolak dengan 401', async () => {
  tokenStorage.clear()
  await rejects(mock.me(), 401)
})

test('me() dengan token mengembalikan user yang login', async () => {
  await loginAs('ts@servolta.test')
  assert.equal((await mock.me()).role, 'ts')
})

test('intern tidak boleh menulis FAQ (403), cs boleh', async () => {
  const payload = { category: 'cs', question: 'Tes?', answer: 'Ya.' }

  await loginAs('intern@servolta.test')
  await rejects(mock.createFaq(1, payload), 403)

  await loginAs('cs@servolta.test')
  const created = await mock.createFaq(1, payload)
  assert.equal(created.product_id, 1)
  assert.ok((await mock.listFaqs(1)).some((f) => f.id === created.id))

  const updated = await mock.updateFaq(created.id, { ...payload, answer: 'Sudah diubah.' })
  assert.equal(updated.answer, 'Sudah diubah.')

  await mock.deleteFaq(created.id)
  assert.ok(!(await mock.listFaqs(1)).some((f) => f.id === created.id))
})

test('validasi FAQ: pertanyaan/jawaban kosong ditolak dengan 422', async () => {
  await loginAs('cs@servolta.test')
  await assert.rejects(
    mock.createFaq(1, { category: 'cs', question: ' ', answer: '' }),
    (error) => error.status === 422 && 'question' in error.errors && 'answer' in error.errors,
  )
})

test('daftar produk butuh login', async () => {
  tokenStorage.clear()
  await rejects(mock.listProducts(), 401)
  await loginAs('cs@servolta.test')
  assert.ok((await mock.listProducts()).length > 0)
})

test('ringkasan beranda: jumlah FAQ dan produk', async () => {
  await loginAs('cs@servolta.test')
  const overview = await mock.getOverview()
  assert.ok(overview.faq > 0)
  assert.equal(overview.products, (await mock.listProducts()).length)
})

const pdfFile = (name = 'ds.pdf', size = 2000) => ({ name, size })

test('wiring & datasheet: semua role bisa melihat', async () => {
  for (const role of ROLES) {
    await loginAs(`${role}@servolta.test`)
    const wiring = await mock.listWiring(2)
    assert.equal(wiring.length, 2)
    assert.ok(wiring.every((w) => w.kind === 'diagram' && w.diagram.nodes.length >= 3))
    const sheet = await mock.getDatasheet(1)
    assert.ok(sheet.specs.length > 0)
    assert.ok(sheet.documents.length >= 1)
  }
})

test('unggah wiring: hanya role write_products, dengan validasi', async () => {
  await loginAs('cs@servolta.test')
  await rejects(mock.createWiring(1, { title: 'x', file: pdfFile('a.png') }), 403)
  await rejects(mock.deleteWiring(1), 403)

  await loginAs('spv@servolta.test')
  await rejects(mock.createWiring(1, { title: '', file: pdfFile('a.png') }), 422)
  await rejects(mock.createWiring(1, { title: 'x', file: pdfFile('a.pdf') }), 422)

  const before = (await mock.listWiring(1)).length
  const created = await mock.createWiring(1, {
    title: ' Foto lapangan ',
    rev: '',
    file: pdfFile('foto.HEIC'),
  })
  assert.equal(created.title, 'Foto lapangan')
  assert.equal(created.kind, 'image')
  assert.equal(created.format, 'JPG')
  assert.equal(created.previewable, false)
  assert.equal(created.rev, '1')
  assert.equal((await mock.listWiring(1)).length, before + 1)
  assert.equal((await mock.getWiringImage(created.id)).name, 'foto.HEIC')

  await mock.deleteWiring(created.id)
  assert.equal((await mock.listWiring(1)).length, before)
  await rejects(mock.getWiringImage(created.id), 404)
})

test('unggah datasheet: hanya PDF, dan bisa diunduh kembali', async () => {
  await loginAs('intern@servolta.test')
  await rejects(mock.createDatasheetDoc(1, { title: 'x', file: pdfFile() }), 403)

  await loginAs('admin@servolta.test')
  await rejects(mock.createDatasheetDoc(1, { title: 'x', file: pdfFile('a.png') }), 422)
  const doc = await mock.createDatasheetDoc(1, {
    title: 'Datasheet (EN)',
    rev: '4',
    file: pdfFile(),
  })
  assert.equal(doc.rev, '4')
  assert.equal((await mock.downloadDatasheet(doc.id)).name, 'ds.pdf')
  await mock.deleteDatasheetDoc(doc.id)
  await rejects(mock.downloadDatasheet(doc.id), 404)
})

test('datasheet contoh diunduh sebagai PDF', async () => {
  await loginAs('cs@servolta.test')
  const [doc] = (await mock.getDatasheet(1)).documents
  const blob = await mock.downloadDatasheet(doc.id)
  assert.equal(blob.type, 'application/pdf')
  assert.ok((await blob.text()).startsWith('%PDF-1.4'))
})

test('ringkasan beranda menghitung wiring dan datasheet', async () => {
  await loginAs('cs@servolta.test')
  mock.resetMock()
  const o = await mock.getOverview()
  assert.equal(o.wiring, 11)
  assert.equal(o.datasheet, 13)
})
