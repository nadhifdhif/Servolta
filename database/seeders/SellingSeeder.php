<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class SellingSeeder extends Seeder
{
    /**
     * Saran upselling dan cross selling contoh (sama dengan data mock di FE). Jalankan setelah ProductSeeder.
     * Hanya untuk lokal/testing.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->warn('SellingSeeder dilewati: hanya untuk environment local/testing.');

            return;
        }

        $ids = Product::query()->pluck('id', 'sku');

        foreach ($this->rows() as [$sku, $type, $targetSku, $pitch]) {
            if (! isset($ids[$sku], $ids[$targetSku])) {
                continue; // produk belum ada: lewati
            }

            Product::query()->find($ids[$sku])->sellingSuggestions()->updateOrCreate(
                ['target_id' => $ids[$targetSku], 'type' => $type],
                ['pitch' => $pitch],
            );
        }
    }

    /**
     * @return list<array{string, string, string, string}> [sku asal, jenis, sku tujuan, pesan]
     */
    private function rows(): array
    {
        return [
            ['SVR-1000', 'upsell', 'SVR-2000',
                'Kalau bebannya di atas 800 W atau mau dipakai untuk AC 1 PK, sebaiknya pakai SVR-2000 (1600 W). Lebih aman dan tidak mudah mati sendiri.'],
            ['UPS-650', 'upsell', 'UPS-1200',
                'Untuk PC kasir plus printer, UPS 1200VA lebih cocok: cadangan sekitar 12 menit dan ada 4 stopkontak.'],
            ['CAM-D2', 'upsell', 'CAM-B4',
                'Kalau lokasinya kena hujan langsung atau butuh jarak pandang malam lebih jauh, tipe Bullet 4MP lebih pas (IP67, IR 30 m).'],
            ['SVR-1000', 'cross', 'UPS-650',
                'Stabilizer menjaga tegangan tetap stabil, UPS menjaga perangkat tetap hidup saat listrik padam. Banyak pelanggan memakai keduanya.'],
            ['UPS-650', 'cross', 'SVR-1000',
                'Kalau tegangan di lokasi sering naik turun, UPS sebaiknya dipasang setelah stabilizer SVR-1000.'],
            ['RTR-AX18', 'cross', 'UPS-650',
                'Supaya internet tetap menyala saat listrik padam, router bisa dipasang ke UPS 650VA (bisa lebih dari 1 jam).'],
            ['CAM-D2', 'cross', 'PWR-12V5A',
                'Adaptor 12V 5A cukup untuk beberapa kamera sekaligus. Sisakan kapasitas sekitar 20%.'],
            ['CAM-B4', 'cross', 'PWR-12V5A',
                'Adaptor 12V 5A cukup untuk beberapa kamera sekaligus. Sisakan kapasitas sekitar 20%.'],
        ];
    }
}
