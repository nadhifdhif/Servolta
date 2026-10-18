// Data contoh untuk menu Wiring dan Datasheet (mode mock).
// Isinya mengikuti pratinjau; di backend asli, wiring berupa file gambar yang diunggah.

const DIAGRAMS = {
  stab: {
    title: 'Instalasi dasar',
    tag: 'Instalasi',
    rev: '2',
    date: '2026-09-12',
    format: 'PNG',
    dimensions: '1600 × 640 px',
    size: 420 * 1024,
    note: '',
    diagram: {
      nodes: [
        ['PLN', '220 VAC · 50 Hz'],
        ['MCB 6 A', 'Pemutus arus'],
        ['Stabilizer', 'INPUT → OUTPUT'],
        ['Beban', 'maks. sesuai tipe'],
      ],
      links: [
        ['L', 'N', 'PE', '3 × 1,5 mm²'],
        ['L', 'N', 'PE', '3 × 1,5 mm²'],
        ['L', 'N', 'PE', '3 × 1,5 mm²'],
      ],
      steps: [
        'Matikan MCB sebelum memasang kabel.',
        'Sambungkan L, N, dan PE ke terminal INPUT sesuai warna kabel.',
        'Sambungkan beban ke terminal OUTPUT. Jangan melebihi kapasitas daya (W).',
        'Nyalakan MCB, tunggu 3 detik sampai lampu hijau menyala, baru nyalakan beban.',
      ],
      warn: 'Pastikan kabel PE tersambung ke arde yang baik. Tanpa arde, proteksi tidak bekerja.',
    },
  },
  'stab-ac': {
    title: 'Dengan AC 1 PK',
    tag: 'Instalasi',
    rev: '1',
    date: '2026-08-30',
    format: 'JPG',
    dimensions: '2000 × 1500 px',
    size: 910 * 1024,
    note: 'Foto lapangan 4032 × 3024 px, diperkecil otomatis',
    diagram: {
      nodes: [
        ['PLN', '220 VAC · 50 Hz'],
        ['MCB 10 A', 'Khusus AC'],
        ['SVR-2000', 'INPUT → OUTPUT'],
        ['AC 1 PK', '≤ 800 W'],
      ],
      links: [
        ['L', 'N', 'PE', '3 × 2,5 mm²'],
        ['L', 'N', 'PE', '3 × 2,5 mm²'],
        ['L', 'N', 'PE', '3 × 2,5 mm²'],
      ],
      steps: [
        'Gunakan MCB 10 A khusus untuk jalur stabilizer dan AC.',
        'Pakai kabel 3 × 2,5 mm² dari MCB sampai AC.',
        'Jangan menambah perangkat lain di output yang sama dengan AC.',
      ],
      warn: 'Arus start AC bisa 3-5 kali arus normal. Jangan pakai SVR-1000 untuk AC.',
    },
  },
  ups: {
    title: 'Instalasi UPS',
    tag: 'Instalasi',
    rev: '3',
    date: '2026-10-05',
    format: 'SVG',
    dimensions: 'Vektor',
    size: 18 * 1024,
    note: '',
    diagram: {
      nodes: [
        ['Stopkontak PLN', '220 VAC · berarde'],
        ['UPS', 'INPUT → OUTPUT'],
        ['Perangkat', 'PC · modem · router'],
      ],
      links: [
        ['L', 'N', 'PE', 'Kabel IEC C14'],
        ['L', 'N', 'PE', 'Kabel IEC C13'],
      ],
      steps: [
        'Colokkan UPS ke stopkontak berarde, bukan ke terminal kabel (colokan sambung).',
        'Isi baterai minimal 8 jam sebelum dipakai pertama kali.',
        'Colokkan perangkat ke stopkontak bertanda BATTERY BACKUP.',
        'Hindari printer laser dan perangkat berdaya besar.',
      ],
      warn: 'Jangan colok UPS ke UPS atau stabilizer lain secara berantai.',
    },
  },
  router: {
    title: 'Koneksi internet',
    tag: 'Instalasi',
    rev: '2',
    date: '2026-09-18',
    format: 'PNG',
    dimensions: '1600 × 640 px',
    size: 380 * 1024,
    note: '',
    diagram: {
      nodes: [
        ['ONT / Modem', 'Port LAN'],
        ['Router AX1800', 'WAN → LAN1-4'],
        ['Perangkat', 'PC · AP · NVR'],
      ],
      links: [
        ['DATA', 'UTP Cat5e ≤ 100 m'],
        ['DATA', 'UTP Cat5e ≤ 100 m'],
      ],
      steps: [
        'Colokkan kabel UTP dari port LAN modem ke port WAN (biru) router.',
        'Sambungkan perangkat berkabel ke port LAN 1-4.',
        'Nyalakan adaptor 12 V 1 A. Tunggu lampu internet menyala stabil.',
        'Login ke 192.168.0.1 untuk mengatur nama dan sandi WiFi.',
      ],
      warn: 'Ganti sandi admin bawaan setelah login pertama.',
    },
  },
  'cctv-power': {
    title: 'Jalur daya kamera',
    tag: 'Kelistrikan',
    rev: '1',
    date: '2026-10-02',
    format: 'JPG',
    dimensions: '2000 × 1500 px',
    size: 760 * 1024,
    note: 'Diunggah sebagai HEIC, diubah otomatis ke JPG',
    diagram: {
      nodes: [
        ['Adaptor', '12 V 5 A'],
        ['Splitter DC', '1 → 4 jack'],
        ['Kamera', '12 VDC'],
      ],
      links: [
        ['POS', 'NEG', 'Kabel 2 × 0,75 mm²'],
        ['POS', 'NEG', 'Maks. 20 m'],
      ],
      steps: [
        'Pastikan polaritas benar: pusat jack positif (+).',
        'Sisakan kapasitas adaptor 20% dari total arus kamera.',
        'Jarak kabel daya maksimal 20 m agar tegangan tidak turun.',
      ],
      warn: 'Polaritas terbalik dapat merusak kamera.',
    },
  },
  'cctv-video': {
    title: 'Jalur video',
    tag: 'Instalasi',
    rev: '1',
    date: '2026-10-02',
    format: 'PNG',
    dimensions: '1600 × 640 px',
    size: 350 * 1024,
    note: '',
    diagram: {
      nodes: [
        ['Kamera', 'Keluaran BNC'],
        ['Kabel RG59', 'Konektor BNC'],
        ['DVR', 'Channel video'],
      ],
      links: [
        ['DATA', 'Coaxial RG59 ≤ 300 m'],
        ['DATA', 'BNC'],
      ],
      steps: [
        'Pasang konektor BNC dengan crimp, bukan sambung seadanya.',
        'Samakan standar kamera dan DVR (AHD / TVI / CVI).',
        'Cek gambar di tiap channel setelah terpasang.',
      ],
      warn: 'Jauhkan kabel video dari kabel listrik untuk mengurangi gangguan gambar.',
    },
  },
  power: {
    title: 'Pemakaian adaptor',
    tag: 'Kelistrikan',
    rev: '1',
    date: '2026-08-20',
    format: 'SVG',
    dimensions: 'Vektor',
    size: 21 * 1024,
    note: '',
    diagram: {
      nodes: [
        ['Stopkontak', '100 – 240 VAC'],
        ['Adaptor', '12 V 5 A'],
        ['Splitter DC', '1 → 4 jack'],
        ['Kamera', '12 VDC'],
      ],
      links: [
        ['L', 'N', 'Kabel power'],
        ['POS', 'NEG', 'DC 5,5 × 2,1 mm'],
        ['POS', 'NEG', 'DC 5,5 × 2,1 mm'],
      ],
      steps: [
        'Colokkan adaptor ke stopkontak, lalu sambungkan ke splitter DC.',
        'Total arus perangkat maksimal 4 A (sisakan 20%).',
      ],
      warn: 'Jangan menutup adaptor saat dipakai agar tidak terlalu panas.',
    },
  },
}

const PRODUCT_WIRING = {
  1: ['stab'],
  2: ['stab', 'stab-ac'],
  3: ['ups'],
  4: ['ups'],
  5: ['router'],
  6: ['cctv-power', 'cctv-video'],
  7: ['cctv-power', 'cctv-video'],
  8: ['power'],
}

export const MOCK_SPECS = {
  1: [
    ['Kapasitas', '1000 VA / 800 W'],
    ['Tegangan input', '140 – 260 VAC'],
    ['Tegangan output', '220 VAC ± 3%'],
    ['Frekuensi', '50 Hz'],
    ['Waktu respon', '0,5 detik'],
    ['Proteksi', 'Tegangan rendah/tinggi, tunda 3 detik'],
    ['Dimensi (P × L × T)', '24 × 18 × 30 cm'],
    ['Berat', '9,5 kg'],
    ['Garansi', '1 tahun'],
  ],
  2: [
    ['Kapasitas', '2000 VA / 1600 W'],
    ['Tegangan input', '140 – 260 VAC'],
    ['Tegangan output', '220 VAC ± 3%'],
    ['Frekuensi', '50 Hz'],
    ['Waktu respon', '0,5 detik'],
    ['Proteksi', 'Tegangan rendah/tinggi, tunda 3 detik'],
    ['Dimensi (P × L × T)', '30 × 22 × 36 cm'],
    ['Berat', '14,5 kg'],
    ['Garansi', '1 tahun'],
  ],
  3: [
    ['Kapasitas', '650 VA / 360 W'],
    ['Topologi', 'Line interactive'],
    ['Tegangan input', '160 – 280 VAC'],
    ['Baterai', '12 V 7 Ah × 1'],
    ['Cadangan', '± 10 menit (beban 200 W)'],
    ['Stopkontak', '3 (semua berbackup)'],
    ['Dimensi (P × L × T)', '28 × 10 × 14 cm'],
    ['Berat', '4,2 kg'],
    ['Garansi', '1 tahun, baterai 6 bulan'],
  ],
  4: [
    ['Kapasitas', '1200 VA / 720 W'],
    ['Topologi', 'Line interactive'],
    ['Tegangan input', '160 – 280 VAC'],
    ['Baterai', '12 V 9 Ah × 2'],
    ['Cadangan', '± 12 menit (beban 400 W)'],
    ['Stopkontak', '4 (semua berbackup)'],
    ['Dimensi (P × L × T)', '33 × 14 × 22 cm'],
    ['Berat', '9,8 kg'],
    ['Garansi', '1 tahun, baterai 6 bulan'],
  ],
  5: [
    ['Standar WiFi', 'WiFi 6 (802.11ax) dual band'],
    ['Kecepatan', '574 Mbps (2,4 GHz) + 1201 Mbps (5 GHz)'],
    ['Port', '1 WAN + 4 LAN Gigabit'],
    ['Antena', '4 eksternal'],
    ['Daya', '12 VDC 1 A'],
    ['Perangkat nyaman', '30 – 40 aktif bersamaan'],
    ['Garansi', '1 tahun'],
  ],
  6: [
    ['Resolusi', '2 MP (1080p)'],
    ['Lensa', '3,6 mm'],
    ['Jarak IR', '20 m'],
    ['Proteksi', 'IP54 (indoor / semi-outdoor)'],
    ['Daya', '12 VDC 0,5 A'],
    ['Keluaran video', 'AHD / TVI / CVI / CVBS'],
    ['Garansi', '1 tahun'],
  ],
  7: [
    ['Resolusi', '4 MP'],
    ['Lensa', '3,6 mm'],
    ['Jarak IR', '30 m'],
    ['Proteksi', 'IP67 (outdoor)'],
    ['Daya', '12 VDC 0,6 A'],
    ['Keluaran video', 'AHD / TVI / CVI / CVBS'],
    ['Garansi', '1 tahun'],
  ],
  8: [
    ['Input', '100 – 240 VAC, 50/60 Hz'],
    ['Output', '12 VDC 5 A (60 W)'],
    ['Konektor', 'DC 5,5 × 2,1 mm'],
    ['Proteksi', 'Hubung singkat, beban lebih'],
    ['Dimensi', '11 × 5 × 3 cm'],
    ['Garansi', '6 bulan'],
  ],
}

let wiringId = 1
export const MOCK_WIRING = Object.entries(PRODUCT_WIRING).flatMap(([productId, keys]) =>
  keys.map((key) => {
    const { diagram, ...meta } = DIAGRAMS[key]
    return { id: wiringId++, product_id: Number(productId), kind: 'diagram', ...meta, diagram }
  }),
)

const GUIDE_PRODUCTS = [1, 2, 3, 4, 5]
let docId = 1
export const MOCK_DOCUMENTS = Object.keys(MOCK_SPECS).flatMap((id) => {
  const productId = Number(id)
  const docs = [
    {
      id: docId++,
      product_id: productId,
      kind: 'datasheet',
      title: 'Datasheet',
      pages: 2,
      size: 480 * 1024,
      rev: '3',
      date: '2026-09-12',
      lang: 'Indonesia',
    },
  ]
  if (GUIDE_PRODUCTS.includes(productId)) {
    docs.push({
      id: docId++,
      product_id: productId,
      kind: 'guide',
      title: 'Panduan pengguna',
      pages: 8,
      size: 1240 * 1024,
      rev: '2',
      date: '2026-08-28',
      lang: 'Indonesia',
    })
  }
  return docs
})
