<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Data contoh (sama dengan data mock di FE) agar FE bisa dicoba dengan backend asli.
     * Hanya untuk lokal/testing. Dokumen wiring dan datasheet tidak di-seed: unggah lewat aplikasi.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->warn('ProductSeeder dilewati: hanya untuk environment local/testing.');

            return;
        }

        foreach ($this->products() as $data) {
            $product = Product::query()->updateOrCreate(
                ['sku' => $data['sku']],
                ['name' => $data['name'], 'specs' => $data['specs']],
            );

            // FAQ hanya diisi bila produk belum punya, supaya seeding ulang tidak menduplikasi.
            if ($product->faqs()->doesntExist()) {
                foreach ($data['faqs'] as [$category, $question, $answer]) {
                    $product->faqs()->create(compact('category', 'question', 'answer'));
                }
            }
        }
    }

    /**
     * @return list<array{sku: string, name: string, specs: list<array{string, string}>, faqs: list<array{string, string, string}>}>
     */
    private function products(): array
    {
        return [
        [
            'sku' => 'SVR-1000',
            'name' => 'Stabilizer Servo 1000VA',
            'specs' => [
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
            'faqs' => [
                ['cs', 'Berapa lama garansi Stabilizer Servo 1000VA?', 'Garansi resmi 1 tahun sejak tanggal pembelian. Mohon siapkan nota atau nomor pesanan untuk klaim ya, Kak.'],
                ['cs', 'Apakah bisa dikirim ke luar pulau?', 'Bisa, Kak. Kami kirim ke seluruh Indonesia lewat ekspedisi rekanan. Estimasi 3-7 hari kerja tergantung tujuan.'],
                ['ts', 'Stabilizer berbunyi berdengung saat dinyalakan, apakah normal?', 'Dengung ringan saat servo menyesuaikan tegangan itu normal. Jika dengung keras terus-menerus, mohon cek apakah beban melebihi 800W lalu kirimkan video suaranya ke kami.'],
                ['ts', 'Lampu indikator merah menyala, artinya apa?', 'Lampu merah menandakan tegangan input di luar batas (di bawah 140V atau di atas 260V). Cabut beban, tunggu 1 menit, lalu nyalakan kembali.'],
            ],
        ],
        [
            'sku' => 'SVR-2000',
            'name' => 'Stabilizer Servo 2000VA',
            'specs' => [
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
            'faqs' => [
                ['cs', 'Apa bedanya SVR-2000 dengan SVR-1000?', 'SVR-2000 berkapasitas 2000VA (maks. beban sekitar 1600W), cocok untuk beberapa perangkat sekaligus. SVR-1000 untuk beban hingga sekitar 800W.'],
                ['ts', 'Stabilizer mati sendiri saat dipakai AC, kenapa?', 'AC punya arus start yang besar. Pastikan AC tidak lebih dari 1 PK untuk SVR-2000 dan jangan dipakai bersama perangkat berdaya besar lain.'],
            ],
        ],
        [
            'sku' => 'UPS-650',
            'name' => 'UPS Line Interactive 650VA',
            'specs' => [
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
            'faqs' => [
                ['cs', 'Berapa lama UPS 650VA bisa menyala saat listrik padam?', 'Untuk PC standar (sekitar 200W) kurang lebih 8-12 menit. Untuk modem dan router bisa lebih dari 1 jam.'],
                ['ts', 'UPS berbunyi bip setiap beberapa detik', 'Itu tanda UPS sedang memakai baterai karena listrik padam. Jika listrik normal tetapi tetap berbunyi, cek apakah kabel input terpasang kuat.'],
                ['ts', 'Baterai UPS cepat habis, apa bisa diganti?', 'Bisa. Baterai UPS umumnya bertahan 2-3 tahun. Hubungi kami dengan nomor pesanan untuk pembelian baterai pengganti yang sesuai.'],
            ],
        ],
        [
            'sku' => 'UPS-1200',
            'name' => 'UPS Line Interactive 1200VA',
            'specs' => [
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
            'faqs' => [
                ['cs', 'Apakah UPS 1200VA bisa untuk mesin kasir dan printer?', 'Bisa untuk 1 PC kasir, monitor, dan printer struk. Hindari printer laser karena arus startnya besar.'],
            ],
        ],
        [
            'sku' => 'RTR-AX18',
            'name' => 'Router WiFi 6 AX1800',
            'specs' => [
                ['Standar WiFi', 'WiFi 6 (802.11ax) dual band'],
                ['Kecepatan', '574 Mbps (2,4 GHz) + 1201 Mbps (5 GHz)'],
                ['Port', '1 WAN + 4 LAN Gigabit'],
                ['Antena', '4 eksternal'],
                ['Daya', '12 VDC 1 A'],
                ['Perangkat nyaman', '30 – 40 aktif bersamaan'],
                ['Garansi', '1 tahun'],
            ],
            'faqs' => [
                ['cs', 'Router AX1800 mendukung berapa perangkat?', 'Rata-rata nyaman untuk 30-40 perangkat aktif secara bersamaan, tergantung pemakaian.'],
                ['ts', 'Bagaimana cara reset router ke pengaturan pabrik?', 'Nyalakan router, tahan tombol Reset selama 10 detik hingga semua lampu berkedip, lalu lepas. Login kembali memakai kredensial pada stiker di bawah router.'],
                ['ts', 'WiFi 5GHz tidak terdeteksi di HP lama', 'Beberapa HP lama hanya mendukung 2.4GHz. Pastikan HP mendukung 5GHz, dan cek di pengaturan router bahwa band 5GHz aktif.'],
            ],
        ],
        [
            'sku' => 'CAM-D2',
            'name' => 'CCTV Dome Camera 2MP',
            'specs' => [
                ['Resolusi', '2 MP (1080p)'],
                ['Lensa', '3,6 mm'],
                ['Jarak IR', '20 m'],
                ['Proteksi', 'IP54 (indoor / semi-outdoor)'],
                ['Daya', '12 VDC 0,5 A'],
                ['Keluaran video', 'AHD / TVI / CVI / CVBS'],
                ['Garansi', '1 tahun'],
            ],
            'faqs' => [
                ['cs', 'Apakah CCTV Dome 2MP tahan hujan?', 'Dome ini untuk pemakaian indoor/semi-outdoor (IP54). Untuk area terkena hujan langsung kami sarankan tipe Bullet.'],
                ['ts', 'Gambar CCTV buram di malam hari', 'Bersihkan lensa dan pastikan tidak ada kaca di depan kamera karena memantulkan inframerah. Cek juga adaptor mengeluarkan 12V stabil.'],
            ],
        ],
        [
            'sku' => 'CAM-B4',
            'name' => 'CCTV Bullet Camera 4MP',
            'specs' => [
                ['Resolusi', '4 MP'],
                ['Lensa', '3,6 mm'],
                ['Jarak IR', '30 m'],
                ['Proteksi', 'IP67 (outdoor)'],
                ['Daya', '12 VDC 0,6 A'],
                ['Keluaran video', 'AHD / TVI / CVI / CVBS'],
                ['Garansi', '1 tahun'],
            ],
            'faqs' => [
                ['cs', 'Berapa jarak pandang malam CCTV Bullet 4MP?', 'Jarak inframerah hingga sekitar 30 meter pada kondisi tanpa penghalang.'],
                ['ts', 'Kamera tidak terdeteksi di DVR', 'Cek kabel BNC/konektor, lalu pastikan DVR dan kamera memakai standar yang sama (AHD/TVI/CVI). Coba pindah ke channel lain untuk memastikan.'],
            ],
        ],
        [
            'sku' => 'PWR-12V5A',
            'name' => 'Adaptor Power Supply 12V 5A',
            'specs' => [
                ['Input', '100 – 240 VAC, 50/60 Hz'],
                ['Output', '12 VDC 5 A (60 W)'],
                ['Konektor', 'DC 5,5 × 2,1 mm'],
                ['Proteksi', 'Hubung singkat, beban lebih'],
                ['Dimensi', '11 × 5 × 3 cm'],
                ['Garansi', '6 bulan'],
            ],
            'faqs' => [
                ['cs', 'Adaptor 12V 5A cocok untuk berapa kamera?', 'Untuk kamera 2MP (sekitar 0.5A) bisa sampai 8 kamera dengan splitter, disarankan sisakan kapasitas 20%.'],
                ['ts', 'Adaptor panas saat dipakai, normal?', 'Hangat itu normal. Jika terlalu panas untuk disentuh, kurangi beban dan pastikan sirkulasi udara tidak tertutup.'],
            ],
        ],
        ];
    }
}
