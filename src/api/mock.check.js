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

test('unggah wiring: semua role kecuali intern, dengan validasi', async () => {
  await loginAs('intern@servolta.test')
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

test('tambah SKU: semua role kecuali intern, validasi, SKU unik, muncul di daftar dan datasheet', async () => {
  mock.resetMock()
  await loginAs('intern@servolta.test')
  await rejects(mock.createProduct({ sku: 'X-1', name: 'X' }), 403)

  await loginAs('spv@servolta.test')
  await rejects(mock.createProduct({ sku: 'svr-1000', name: 'Duplikat' }), 422)
  await rejects(mock.createProduct({ sku: 'bad sku', name: 'x' }), 422)
  await rejects(mock.createProduct({ sku: 'N-1', name: '' }), 422)
  await rejects(
    mock.createProduct({ sku: 'N-1', name: 'x', specs: [{ label: 'a', value: '' }] }),
    422,
  )

  const before = (await mock.listProducts()).length
  const created = await mock.createProduct({
    sku: ' dht-22 ',
    name: ' Sensor DHT22 ',
    specs: [
      { label: 'Tegangan', value: '3,3 - 5 V' },
      { label: '', value: '' },
    ],
  })
  assert.equal(created.sku, 'DHT-22')
  assert.equal(created.name, 'Sensor DHT22')
  assert.equal((await mock.listProducts()).length, before + 1)
  assert.deepEqual((await mock.getDatasheet(created.id)).specs, [['Tegangan', '3,3 - 5 V']])
  assert.equal((await mock.getOverview()).products, before + 1)
  await rejects(mock.createProduct({ sku: 'DHT-22', name: 'Lagi' }), 422)
  mock.resetMock()
  assert.equal((await mock.listProducts()).length, before)
})

test('upselling & cross selling: semua role bisa lihat, intern tidak bisa tulis', async () => {
  mock.resetMock()
  for (const role of ROLES) {
    await loginAs(`${role}@servolta.test`)
    const entries = await mock.listSelling(1)
    assert.ok(entries.length >= 2)
    assert.ok(entries.every((e) => e.target.sku && e.pitch && ['upsell', 'cross'].includes(e.type)))
  }
  await loginAs('intern@servolta.test')
  await rejects(mock.createSelling(1, { type: 'upsell', target_id: 4, pitch: 'x' }), 403)
  await rejects(mock.updateSelling(1, { type: 'upsell', target_id: 2, pitch: 'x' }), 403)
  await rejects(mock.deleteSelling(1), 403)
})

test('upselling & cross selling: CS sampai role teratas bisa menambah, mengubah, menghapus', async () => {
  for (const role of ['cs', 'ts', 'mo', 'sales', 'konten', 'spv', 'admin']) {
    mock.resetMock()
    await loginAs(`${role}@servolta.test`)
    const created = await mock.createSelling(2, {
      type: 'cross',
      target_id: '8',
      pitch: ' Pasang adaptor. ',
    })
    assert.equal(created.target.sku, 'PWR-12V5A', role)
    assert.equal(created.pitch, 'Pasang adaptor.')
    const updated = await mock.updateSelling(created.id, {
      type: 'upsell',
      target_id: 4,
      pitch: 'Baru',
    })
    assert.equal(updated.type, 'upsell')
    assert.equal(updated.target.sku, 'UPS-1200')
    await mock.deleteSelling(created.id)
    assert.ok(!(await mock.listSelling(2)).some((e) => e.id === created.id))
  }
})

test('upselling & cross selling: validasi dan duplikat', async () => {
  mock.resetMock()
  await loginAs('cs@servolta.test')
  await rejects(mock.createSelling(1, { type: 'upsell', target_id: 1, pitch: 'x' }), 422) // diri sendiri
  await rejects(mock.createSelling(1, { type: 'upsell', target_id: 999, pitch: 'x' }), 422)
  await rejects(mock.createSelling(1, { type: 'upsell', target_id: 4, pitch: ' ' }), 422)
  await rejects(mock.createSelling(1, { type: 'upsell', target_id: 2, pitch: 'x' }), 422) // sudah ada
  await rejects(mock.createSelling(999, { type: 'upsell', target_id: 2, pitch: 'x' }), 404)
  await rejects(mock.updateSelling(999, { type: 'upsell', target_id: 2, pitch: 'x' }), 404)
  // mengubah entri tanpa mengganti tujuan tidak dianggap duplikat dirinya sendiri
  const [first] = await mock.listSelling(1)
  await mock.updateSelling(first.id, {
    type: first.type,
    target_id: first.target_id,
    pitch: 'Sama saja',
  })
})

test('produk baru punya daftar selling kosong dan bisa dipilih sebagai tujuan', async () => {
  mock.resetMock()
  await loginAs('spv@servolta.test')
  const p = await mock.createProduct({ sku: 'NEW-1', name: 'Baru' })
  assert.deepEqual(await mock.listSelling(p.id), [])
  const e = await mock.createSelling(1, { type: 'cross', target_id: p.id, pitch: 'Cocok.' })
  assert.equal(e.target.sku, 'NEW-1')
  mock.resetMock()
  assert.ok(!(await mock.listSelling(1)).some((x) => x.target.sku === 'NEW-1'))
})

test('pengguna: hanya admin dan spv yang bisa mengelola', async () => {
  mock.resetMock()
  for (const role of ['ts', 'mo', 'cs', 'sales', 'konten', 'intern']) {
    await loginAs(`${role}@servolta.test`)
    await rejects(mock.listUsers(), 403)
    await rejects(
      mock.createUser({ name: 'x', email: 'x@y.test', role: 'cs', password: 'sandi-panjang-1' }),
      403,
    )
  }
})

test('pengguna: admin melihat semua, spv hanya staf di bawahnya', async () => {
  mock.resetMock()
  await loginAs('admin@servolta.test')
  assert.equal((await mock.listUsers()).length, MOCK_ACCOUNTS.length)

  await loginAs('spv@servolta.test')
  const roles = (await mock.listUsers()).map((u) => u.role)
  assert.ok(roles.length > 0)
  assert.ok(!roles.includes('admin') && !roles.includes('spv'))
  assert.ok((await mock.listUsers()).every((u) => !('password' in u)))
})

test('pengguna: tambah, login dengan akun baru, ubah, nonaktifkan, hapus', async () => {
  mock.resetMock()
  await loginAs('spv@servolta.test')
  await rejects(
    mock.createUser({ name: 'x', email: 'x@y.test', role: 'spv', password: 'sandi-panjang-1' }),
    422,
  )
  await rejects(
    mock.createUser({ name: 'x', email: 'x@y.test', role: 'admin', password: 'sandi-panjang-1' }),
    422,
  )
  await rejects(
    mock.createUser({
      name: 'x',
      email: 'cs@servolta.test',
      role: 'cs',
      password: 'sandi-panjang-1',
    }),
    422,
  )
  await rejects(
    mock.createUser({ name: 'x', email: 'x@y.test', role: 'cs', password: 'pendek' }),
    422,
  )

  const created = await mock.createUser({
    name: ' Orang Baru ',
    email: ' Baru@Servolta.TEST ',
    role: 'konten',
    password: 'sandi-panjang-1',
  })
  assert.equal(created.email, 'baru@servolta.test')
  assert.equal(created.role_label, 'Content and Branding')
  assert.equal(created.permissions.write_faq, true)
  assert.ok(!('password' in created))

  const session = await mock.login('BARU@servolta.test', 'sandi-panjang-1')
  assert.equal(session.user.role, 'konten')

  const updated = await mock.updateUser(created.id, {
    name: 'Nama Lain',
    email: 'baru@servolta.test',
    role: 'intern',
    password: '',
  })
  assert.equal(updated.role, 'intern')
  assert.equal(updated.permissions.write_faq, false)
  await mock.login('baru@servolta.test', 'sandi-panjang-1') // sandi lama tetap berlaku

  await mock.updateUser(created.id, {
    name: 'Nama Lain',
    email: 'baru@servolta.test',
    role: 'intern',
    password: 'sandi-baru-123',
  })
  await rejects(mock.login('baru@servolta.test', 'sandi-panjang-1'), 422)
  await mock.login('baru@servolta.test', 'sandi-baru-123')

  await mock.updateUser(created.id, {
    name: 'Nama Lain',
    email: 'baru@servolta.test',
    role: 'intern',
    is_active: false,
  })
  await rejects(mock.login('baru@servolta.test', 'sandi-baru-123'), 422)

  await loginAs('spv@servolta.test')
  await mock.deleteUser(created.id)
  assert.ok(!(await mock.listUsers()).some((u) => u.id === created.id))
  await rejects(mock.deleteUser(created.id), 404)
})

test('pengguna: batas supervisor, akun sendiri, dan email unik saat ubah', async () => {
  mock.resetMock()
  const me = await loginAs('spv@servolta.test')
  const adminId = MOCK_ACCOUNTS.find((a) => a.role === 'admin').id
  const csAccount = MOCK_ACCOUNTS.find((a) => a.email === 'cs@servolta.test')
  const body = (a, extra = {}) => ({ name: a.name, email: a.email, role: a.role, ...extra })

  await rejects(mock.updateUser(adminId, { name: 'x', email: 'a@b.test', role: 'cs' }), 403)
  await rejects(mock.deleteUser(adminId), 403)
  await rejects(mock.updateUser(me.user.id, body(me.user)), 403) // akun sendiri
  await rejects(mock.deleteUser(me.user.id), 403)
  await rejects(mock.updateUser(csAccount.id, body(csAccount, { role: 'spv' })), 422) // tidak bisa menaikkan jadi spv
  await rejects(mock.updateUser(csAccount.id, body(csAccount, { email: 'ts@servolta.test' })), 422) // email milik akun lain
  await mock.updateUser(csAccount.id, body(csAccount, { name: 'Nama Baru' })) // email sendiri tidak dianggap kembar

  await loginAs('admin@servolta.test')
  await mock.updateUser(MOCK_ACCOUNTS.find((a) => a.role === 'spv').id, {
    name: 'Spv Baru',
    email: 'spv@servolta.test',
    role: 'admin',
  })
})
