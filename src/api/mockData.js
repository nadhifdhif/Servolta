import { ROLES, buildUser } from '../lib/roles.js'

export const MOCK_USERS = ROLES.map((role, index) => buildUser({ id: index + 1, role }))

export const MOCK_PRODUCTS = [
  { id: 1, sku: 'SVR-1000', name: 'Stabilizer Servo 1000VA' },
  { id: 2, sku: 'SVR-2000', name: 'Stabilizer Servo 2000VA' },
  { id: 3, sku: 'UPS-650', name: 'UPS Line Interactive 650VA' },
  { id: 4, sku: 'UPS-1200', name: 'UPS Line Interactive 1200VA' },
  { id: 5, sku: 'RTR-AX18', name: 'Router WiFi 6 AX1800' },
  { id: 6, sku: 'CAM-D2', name: 'CCTV Dome Camera 2MP' },
  { id: 7, sku: 'CAM-B4', name: 'CCTV Bullet Camera 4MP' },
  { id: 8, sku: 'PWR-12V5A', name: 'Adaptor Power Supply 12V 5A' },
]

let nextId = 1
function faq(product_id, category, question, answer) {
  return { id: nextId++, product_id, category, question, answer, updated_at: '2026-10-01T09:00:00Z' }
}

export const MOCK_FAQS = [
  faq(1, 'cs', 'Berapa lama garansi Stabilizer Servo 1000VA?', 'Garansi resmi 1 tahun sejak tanggal pembelian. Mohon siapkan nota atau nomor pesanan untuk klaim ya, Kak.'),
  faq(1, 'cs', 'Apakah bisa dikirim ke luar pulau?', 'Bisa, Kak. Kami kirim ke seluruh Indonesia lewat ekspedisi rekanan. Estimasi 3-7 hari kerja tergantung tujuan.'),
  faq(1, 'ts', 'Stabilizer berbunyi berdengung saat dinyalakan, apakah normal?', 'Dengung ringan saat servo menyesuaikan tegangan itu normal. Jika dengung keras terus-menerus, mohon cek apakah beban melebihi 800W lalu kirimkan video suaranya ke kami.'),
  faq(1, 'ts', 'Lampu indikator merah menyala, artinya apa?', 'Lampu merah menandakan tegangan input di luar batas (di bawah 140V atau di atas 260V). Cabut beban, tunggu 1 menit, lalu nyalakan kembali.'),
  faq(2, 'cs', 'Apa bedanya SVR-2000 dengan SVR-1000?', 'SVR-2000 berkapasitas 2000VA (maks. beban sekitar 1600W), cocok untuk beberapa perangkat sekaligus. SVR-1000 untuk beban hingga sekitar 800W.'),
  faq(2, 'ts', 'Stabilizer mati sendiri saat dipakai AC, kenapa?', 'AC punya arus start yang besar. Pastikan AC tidak lebih dari 1 PK untuk SVR-2000 dan jangan dipakai bersama perangkat berdaya besar lain.'),
  faq(3, 'cs', 'Berapa lama UPS 650VA bisa menyala saat listrik padam?', 'Untuk PC standar (sekitar 200W) kurang lebih 8-12 menit. Untuk modem dan router bisa lebih dari 1 jam.'),
  faq(3, 'ts', 'UPS berbunyi bip setiap beberapa detik', 'Itu tanda UPS sedang memakai baterai karena listrik padam. Jika listrik normal tetapi tetap berbunyi, cek apakah kabel input terpasang kuat.'),
  faq(3, 'ts', 'Baterai UPS cepat habis, apa bisa diganti?', 'Bisa. Baterai UPS umumnya bertahan 2-3 tahun. Hubungi kami dengan nomor pesanan untuk pembelian baterai pengganti yang sesuai.'),
  faq(4, 'cs', 'Apakah UPS 1200VA bisa untuk mesin kasir dan printer?', 'Bisa untuk 1 PC kasir, monitor, dan printer struk. Hindari printer laser karena arus startnya besar.'),
  faq(5, 'cs', 'Router AX1800 mendukung berapa perangkat?', 'Rata-rata nyaman untuk 30-40 perangkat aktif secara bersamaan, tergantung pemakaian.'),
  faq(5, 'ts', 'Bagaimana cara reset router ke pengaturan pabrik?', 'Nyalakan router, tahan tombol Reset selama 10 detik hingga semua lampu berkedip, lalu lepas. Login kembali memakai kredensial pada stiker di bawah router.'),
  faq(5, 'ts', 'WiFi 5GHz tidak terdeteksi di HP lama', 'Beberapa HP lama hanya mendukung 2.4GHz. Pastikan HP mendukung 5GHz, dan cek di pengaturan router bahwa band 5GHz aktif.'),
  faq(6, 'cs', 'Apakah CCTV Dome 2MP tahan hujan?', 'Dome ini untuk pemakaian indoor/semi-outdoor (IP54). Untuk area terkena hujan langsung kami sarankan tipe Bullet.'),
  faq(6, 'ts', 'Gambar CCTV buram di malam hari', 'Bersihkan lensa dan pastikan tidak ada kaca di depan kamera karena memantulkan inframerah. Cek juga adaptor mengeluarkan 12V stabil.'),
  faq(7, 'cs', 'Berapa jarak pandang malam CCTV Bullet 4MP?', 'Jarak inframerah hingga sekitar 30 meter pada kondisi tanpa penghalang.'),
  faq(7, 'ts', 'Kamera tidak terdeteksi di DVR', 'Cek kabel BNC/konektor, lalu pastikan DVR dan kamera memakai standar yang sama (AHD/TVI/CVI). Coba pindah ke channel lain untuk memastikan.'),
  faq(8, 'cs', 'Adaptor 12V 5A cocok untuk berapa kamera?', 'Untuk kamera 2MP (sekitar 0.5A) bisa sampai 8 kamera dengan splitter, disarankan sisakan kapasitas 20%.'),
  faq(8, 'ts', 'Adaptor panas saat dipakai, normal?', 'Hangat itu normal. Jika terlalu panas untuk disentuh, kurangi beban dan pastikan sirkulasi udara tidak tertutup.'),
]
