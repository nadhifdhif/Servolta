// Saran upselling dan cross selling contoh (mode mock). id produk mengikuti mockData.js:
// 1 SVR-1000, 2 SVR-2000, 3 UPS-650, 4 UPS-1200, 5 RTR-AX18, 6 CAM-D2, 7 CAM-B4, 8 PWR-12V5A.

let nextId = 1
const entry = (product_id, type, target_id, pitch) => ({
  id: nextId++,
  product_id,
  type,
  target_id,
  pitch,
  updated_at: '2026-10-05T09:00:00Z',
})

export const MOCK_SELLING = [
  entry(
    1,
    'upsell',
    2,
    'Kalau bebannya di atas 800 W atau mau dipakai untuk AC 1 PK, sebaiknya pakai SVR-2000 (1600 W). Lebih aman dan tidak mudah mati sendiri.',
  ),
  entry(
    3,
    'upsell',
    4,
    'Untuk PC kasir plus printer, UPS 1200VA lebih cocok: cadangan sekitar 12 menit dan ada 4 stopkontak.',
  ),
  entry(
    6,
    'upsell',
    7,
    'Kalau lokasinya kena hujan langsung atau butuh jarak pandang malam lebih jauh, tipe Bullet 4MP lebih pas (IP67, IR 30 m).',
  ),
  entry(
    1,
    'cross',
    3,
    'Stabilizer menjaga tegangan tetap stabil, UPS menjaga perangkat tetap hidup saat listrik padam. Banyak pelanggan memakai keduanya.',
  ),
  entry(
    3,
    'cross',
    1,
    'Kalau tegangan di lokasi sering naik turun, UPS sebaiknya dipasang setelah stabilizer SVR-1000.',
  ),
  entry(
    5,
    'cross',
    3,
    'Supaya internet tetap menyala saat listrik padam, router bisa dipasang ke UPS 650VA (bisa lebih dari 1 jam).',
  ),
  entry(
    6,
    'cross',
    8,
    'Adaptor 12V 5A cukup untuk beberapa kamera sekaligus. Sisakan kapasitas sekitar 20%.',
  ),
  entry(
    7,
    'cross',
    8,
    'Adaptor 12V 5A cukup untuk beberapa kamera sekaligus. Sisakan kapasitas sekitar 20%.',
  ),
]
