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

test('setiap role punya satu akun dengan kode {ROLE}01 (sama dengan seeder backend)', () => {
  for (const role of ROLES) {
    assert.ok(
      MOCK_ACCOUNTS.some((a) => a.role === role && a.login_code === `${role.toUpperCase()}01`),
    )
  }
  assert.ok(
    MOCK_ACCOUNTS.every((a) => !('email' in a)),
    'email tidak dipakai lagi',
  )
})

test('login berhasil mengembalikan token dan user tanpa kata sandi', async () => {
  const result = await mock.login('SPV01', 'password')
  assert.ok(result.token.startsWith('mock.'))
  assert.equal(result.user.role, 'spv')
  assert.equal(result.user.permissions.manage_users, true)
  assert.equal(result.user.login_code, 'SPV01')
  assert.ok(!('password' in result.user))
  assert.ok(!('failed_logins' in result.user))
})

test('kode tidak peka huruf besar/kecil dan spasi', async () => {
  const result = await mock.login('  cs01 ', 'password')
  assert.equal(result.user.role, 'cs')
})

test('kata sandi salah dan kode tak terdaftar menghasilkan pesan yang sama', async () => {
  const wrong = await mock.login('CS01', 'salah').catch((e) => e)
  const unknown = await mock.login('TIDAKADA', 'salah').catch((e) => e)
  assert.equal(wrong.status, 422)
  assert.equal(wrong.message, unknown.message)
  assert.deepEqual(wrong.errors, unknown.errors)
  assert.ok(wrong.errors.code[0])
})

test('akun nonaktif ditolak dengan pesan khusus', async () => {
  await assert.rejects(mock.login('NONAKTIF', 'password'), (error) => {
    return error.status === 422 && error.errors.code[0].includes('dinonaktifkan')
  })
})

test('me() tanpa token ditolak dengan 401', async () => {
  tokenStorage.clear()
  await rejects(mock.me(), 401)
})

test('me() dengan token mengembalikan user yang login', async () => {
  await loginAs('TS01')
  assert.equal((await mock.me()).role, 'ts')
})

test('intern tidak boleh menulis FAQ (403), cs boleh', async () => {
  const payload = { category: 'cs', question: 'Tes?', answer: 'Ya.' }

  await loginAs('INTERN01')
  await rejects(mock.createFaq(1, payload), 403)

  await loginAs('CS01')
  const created = await mock.createFaq(1, payload)
  assert.equal(created.product_id, 1)
  assert.ok((await mock.listFaqs(1)).some((f) => f.id === created.id))

  const updated = await mock.updateFaq(created.id, { ...payload, answer: 'Sudah diubah.' })
  assert.equal(updated.answer, 'Sudah diubah.')

  await mock.deleteFaq(created.id)
  assert.ok(!(await mock.listFaqs(1)).some((f) => f.id === created.id))
})

test('validasi FAQ: pertanyaan/jawaban kosong ditolak dengan 422', async () => {
  await loginAs('CS01')
  await assert.rejects(
    mock.createFaq(1, { category: 'cs', question: ' ', answer: '' }),
    (error) => error.status === 422 && 'question' in error.errors && 'answer' in error.errors,
  )
})

test('daftar produk butuh login', async () => {
  tokenStorage.clear()
  await rejects(mock.listProducts(), 401)
  await loginAs('CS01')
  assert.ok((await mock.listProducts()).length > 0)
})

test('ringkasan beranda: jumlah FAQ dan produk', async () => {
  await loginAs('CS01')
  const overview = await mock.getOverview()
  assert.ok(overview.faq > 0)
  assert.equal(overview.products, (await mock.listProducts()).length)
})

const pdfFile = (name = 'ds.pdf', size = 2000) => ({ name, size })

test('wiring & datasheet: semua role bisa melihat', async () => {
  for (const role of ROLES) {
    await loginAs(`${role.toUpperCase()}01`)
    const wiring = await mock.listWiring(2)
    assert.equal(wiring.length, 2)
    assert.ok(wiring.every((w) => w.kind === 'diagram' && w.diagram.nodes.length >= 3))
    const sheet = await mock.getDatasheet(1)
    assert.ok(sheet.specs.length > 0)
    assert.ok(sheet.documents.length >= 1)
  }
})

test('unggah wiring: semua role kecuali intern, dengan validasi', async () => {
  await loginAs('INTERN01')
  await rejects(mock.createWiring(1, { title: 'x', file: pdfFile('a.png') }), 403)
  await rejects(mock.deleteWiring(1), 403)

  await loginAs('SPV01')
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
  await loginAs('INTERN01')
  await rejects(mock.createDatasheetDoc(1, { title: 'x', file: pdfFile() }), 403)

  await loginAs('ADMIN01')
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
  await loginAs('CS01')
  const [doc] = (await mock.getDatasheet(1)).documents
  const blob = await mock.downloadDatasheet(doc.id)
  assert.equal(blob.type, 'application/pdf')
  assert.ok((await blob.text()).startsWith('%PDF-1.4'))
})

test('ringkasan beranda menghitung wiring dan datasheet', async () => {
  await loginAs('CS01')
  mock.resetMock()
  const o = await mock.getOverview()
  assert.equal(o.wiring, 11)
  assert.equal(o.datasheet, 13)
})

test('tambah SKU: semua role kecuali intern, validasi, SKU unik, muncul di daftar dan datasheet', async () => {
  mock.resetMock()
  await loginAs('INTERN01')
  await rejects(mock.createProduct({ sku: 'X-1', name: 'X' }), 403)

  await loginAs('SPV01')
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
    await loginAs(`${role.toUpperCase()}01`)
    const entries = await mock.listSelling(1)
    assert.ok(entries.length >= 2)
    assert.ok(entries.every((e) => e.target.sku && e.pitch && ['upsell', 'cross'].includes(e.type)))
  }
  await loginAs('INTERN01')
  await rejects(mock.createSelling(1, { type: 'upsell', target_id: 4, pitch: 'x' }), 403)
  await rejects(mock.updateSelling(1, { type: 'upsell', target_id: 2, pitch: 'x' }), 403)
  await rejects(mock.deleteSelling(1), 403)
})

test('upselling & cross selling: CS sampai role teratas bisa menambah, mengubah, menghapus', async () => {
  for (const role of ['cs', 'ts', 'mo', 'sales', 'konten', 'spv', 'admin']) {
    mock.resetMock()
    await loginAs(`${role.toUpperCase()}01`)
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
  await loginAs('CS01')
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
  await loginAs('SPV01')
  const p = await mock.createProduct({ sku: 'NEW-1', name: 'Baru' })
  assert.deepEqual(await mock.listSelling(p.id), [])
  const e = await mock.createSelling(1, { type: 'cross', target_id: p.id, pitch: 'Cocok.' })
  assert.equal(e.target.sku, 'NEW-1')
  mock.resetMock()
  assert.ok(!(await mock.listSelling(1)).some((x) => x.target.sku === 'NEW-1'))
})

const newUser = (extra = {}) => ({
  name: 'Orang Baru',
  login_code: 'BARU0001',
  role: 'cs',
  password: 'sandi-sementara-1',
  ...extra,
})

test('pengguna: hanya admin dan spv yang bisa mengelola', async () => {
  mock.resetMock()
  for (const role of ['ts', 'mo', 'cs', 'sales', 'konten', 'intern']) {
    await loginAs(`${role.toUpperCase()}01`)
    await rejects(mock.listUsers(), 403)
    await rejects(mock.createUser(newUser()), 403)
  }
})

test('pengguna: admin melihat semua, spv hanya staf di bawahnya', async () => {
  mock.resetMock()
  await loginAs('ADMIN01')
  assert.equal((await mock.listUsers()).length, MOCK_ACCOUNTS.length)

  await loginAs('SPV01')
  const roles = (await mock.listUsers()).map((u) => u.role)
  assert.ok(roles.length > 0)
  assert.ok(!roles.includes('admin') && !roles.includes('spv'))
  const row = (await mock.listUsers())[0]
  assert.ok(!('password' in row) && !('email' in row))
  assert.equal(typeof row.is_locked, 'boolean')
})

test('pengguna: akun baru berkode, sandi sementara wajib diganti, lalu bisa dipakai', async () => {
  mock.resetMock()
  await loginAs('SPV01')
  await rejects(mock.createUser(newUser({ role: 'spv' })), 422)
  await rejects(mock.createUser(newUser({ role: 'admin' })), 422)
  await rejects(mock.createUser(newUser({ login_code: 'CS01' })), 422) // kode kembar
  await rejects(mock.createUser(newUser({ login_code: 'ab' })), 422)
  await rejects(mock.createUser(newUser({ password: 'pendek123' })), 422) // kurang dari 10
  await rejects(mock.createUser(newUser({ employee_id: 'abc' })), 422)
  await rejects(mock.createUser(newUser({ employee_id: 100200 })), 422) // ID karyawan milik akun lain

  const created = await mock.createUser(newUser({ login_code: ' baru0001 ', employee_id: '7788' }))
  assert.equal(created.login_code, 'BARU0001')
  assert.equal(created.employee_id, 7788)
  assert.equal(created.must_change_password, true)
  assert.equal(created.role_label, 'Customer Service')
  assert.ok(!('password' in created))

  // kode kosong -> dibuat acak oleh server
  const auto = await mock.createUser(newUser({ login_code: '' }))
  assert.match(auto.login_code, /^[A-HJKMNP-Z2-9]{8}$/)

  // masuk dengan sandi sementara: hanya boleh me() dan ganti sandi
  const session = await mock.login('baru0001', 'sandi-sementara-1')
  tokenStorage.set(session.token)
  assert.equal(session.user.must_change_password, true)
  await rejects(mock.listProducts(), 403)
  await assert.rejects(mock.getOverview(), (e) => e.code === 'password_change_required')
  assert.equal((await mock.me()).login_code, 'BARU0001')

  await rejects(
    mock.changePassword({
      current_password: 'salah',
      password: 'sandi-pilihan-sendiri',
      password_confirmation: 'sandi-pilihan-sendiri',
    }),
    422,
  )
  await rejects(
    mock.changePassword({
      current_password: 'sandi-sementara-1',
      password: 'pendek',
      password_confirmation: 'pendek',
    }),
    422,
  )
  await rejects(
    mock.changePassword({
      current_password: 'sandi-sementara-1',
      password: 'sandi-pilihan-sendiri',
      password_confirmation: 'beda',
    }),
    422,
  )

  const done = await mock.changePassword({
    current_password: 'sandi-sementara-1',
    password: 'sandi-pilihan-sendiri',
    password_confirmation: 'sandi-pilihan-sendiri',
  })
  assert.equal(done.user.must_change_password, false)
  assert.ok((await mock.listProducts()).length > 0)
  await rejects(mock.login('BARU0001', 'sandi-sementara-1'), 422)
  await mock.login('BARU0001', 'sandi-pilihan-sendiri')
})

test('pengguna: ubah, reset sandi memaksa ganti lagi, nonaktifkan, hapus', async () => {
  mock.resetMock()
  await loginAs('SPV01')
  const created = await mock.createUser(newUser())
  const body = (extra = {}) => ({
    name: 'Nama Lain',
    login_code: 'BARU0001',
    role: 'intern',
    password: '',
    ...extra,
  })

  const updated = await mock.updateUser(created.id, body())
  assert.equal(updated.role, 'intern')
  assert.equal(updated.permissions.write_faq, false)
  assert.equal(
    updated.must_change_password,
    true,
    'tanpa reset, status sandi sementara tidak berubah',
  )

  await mock.updateUser(created.id, body({ login_code: 'KODEBARU' }))
  await rejects(mock.login('BARU0001', 'sandi-sementara-1'), 422) // kode lama tidak berlaku
  await mock.login('KODEBARU', 'sandi-sementara-1')

  // akun yang sudah mengganti sandinya lalu direset admin -> wajib ganti lagi
  const session = await mock.login('KODEBARU', 'sandi-sementara-1')
  tokenStorage.set(session.token)
  await mock.changePassword({
    current_password: 'sandi-sementara-1',
    password: 'sandi-pilihan-sendiri',
    password_confirmation: 'sandi-pilihan-sendiri',
  })
  await loginAs('SPV01')
  const reset = await mock.updateUser(
    created.id,
    body({ login_code: 'KODEBARU', password: 'sandi-reset-12345' }),
  )
  assert.equal(reset.must_change_password, true)
  await rejects(mock.login('KODEBARU', 'sandi-pilihan-sendiri'), 422)
  assert.equal((await mock.login('KODEBARU', 'sandi-reset-12345')).user.must_change_password, true)

  await loginAs('SPV01')
  await mock.updateUser(created.id, body({ login_code: 'KODEBARU', is_active: false }))
  await rejects(mock.login('KODEBARU', 'sandi-reset-12345'), 422)

  await mock.deleteUser(created.id)
  assert.ok(!(await mock.listUsers()).some((u) => u.id === created.id))
  await rejects(mock.deleteUser(created.id), 404)
})

test('pengguna: batas supervisor, akun sendiri, kode dan ID karyawan unik saat ubah', async () => {
  mock.resetMock()
  const me = await loginAs('SPV01')
  const adminId = MOCK_ACCOUNTS.find((a) => a.role === 'admin').id
  const cs = MOCK_ACCOUNTS.find((a) => a.login_code === 'CS01')
  const body = (a, extra = {}) => ({
    name: a.name,
    login_code: a.login_code,
    employee_id: a.employee_id,
    role: a.role,
    ...extra,
  })

  await rejects(mock.updateUser(adminId, { name: 'x', login_code: 'ZZZZ', role: 'cs' }), 403)
  await rejects(mock.deleteUser(adminId), 403)
  await rejects(mock.unlockUser(adminId), 403)
  await rejects(mock.updateUser(me.user.id, body(me.user)), 403) // akun sendiri
  await rejects(mock.deleteUser(me.user.id), 403)
  await rejects(mock.updateUser(cs.id, body(cs, { role: 'spv' })), 422)
  await rejects(mock.updateUser(cs.id, body(cs, { login_code: 'TS01' })), 422) // kode milik akun lain
  await rejects(
    mock.updateUser(
      cs.id,
      body(cs, { employee_id: MOCK_ACCOUNTS.find((a) => a.login_code === 'TS01').employee_id }),
    ),
    422,
  )
  await mock.updateUser(cs.id, body(cs, { name: 'Nama Baru' })) // kode dan ID sendiri tidak dianggap kembar

  await loginAs('ADMIN01')
  await mock.updateUser(MOCK_ACCOUNTS.find((a) => a.role === 'spv').id, {
    name: 'Spv Baru',
    login_code: 'SPV01',
    role: 'admin',
  })
})

test('penguncian: 10 kali salah sandi mengunci akun, admin bisa membuka kuncinya', async () => {
  mock.resetMock()
  for (let i = 0; i < 10; i++) await rejects(mock.login('CS01', 'salah'), 422)

  // terkunci: sandi benar pun ditolak dengan pesan yang sama
  const locked = await mock.login('CS01', 'password').catch((e) => e)
  const wrong = await mock.login('CS01', 'salah').catch((e) => e)
  assert.equal(locked.status, 422)
  assert.equal(locked.message, wrong.message)

  await loginAs('SPV01')
  const row = (await mock.listUsers()).find((u) => u.login_code === 'CS01')
  assert.equal(row.is_locked, true)

  const unlocked = await mock.unlockUser(row.id)
  assert.equal(unlocked.is_locked, false)
  await mock.login('CS01', 'password')
})

test('penguncian: login berhasil mengembalikan hitungan gagal ke nol', async () => {
  mock.resetMock()
  for (let i = 0; i < 9; i++) await rejects(mock.login('TS01', 'salah'), 422)
  await mock.login('TS01', 'password') // berhasil sebelum mencapai batas
  for (let i = 0; i < 9; i++) await rejects(mock.login('TS01', 'salah'), 422)
  await mock.login('TS01', 'password') // masih belum terkunci
})

test('akun sendiri: ubah nama dan keluar dari semua perangkat', async () => {
  mock.resetMock()
  await loginAs('CS01')
  assert.equal((await mock.updateProfile({ name: '  Nama Baru ' })).name, 'Nama Baru')
  await rejects(mock.updateProfile({ name: ' ' }), 422)
  await mock.logoutAll()
})
