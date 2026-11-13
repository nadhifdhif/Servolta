// Satu tempat untuk perbedaan mode contoh (mock) dan mode sungguhan.
//
// Mode contoh hanya bisa aktif saat pengembangan (`npm run dev`) DAN VITE_USE_MOCK bukan "false".
// Hasil `npm run build` selalu mode sungguhan, apa pun isi .env, dan kode mock (termasuk akun demo
// beserta sandinya) tidak ikut masuk ke hasil build.
export const isMock = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false'

// Contoh isian: di mode contoh mengikuti data contoh, di mode sungguhan memakai bentuk katalog asli.
export const hints = isMock
  ? {
      product: 'Contoh: SVR-1000 atau stabilizer servo',
      code: 'Contoh: K7M2Q9XA',
      sku: 'Contoh: SVR-3000',
      skuName: 'Contoh: Stabilizer Servo 3000VA',
    }
  : {
      product: 'Ketik SKU atau nama produk',
      code: 'Kode dari admin',
      sku: 'Contoh: BRD-0001',
      skuName: 'Contoh: Arduino Mega 2560 R3 Compatible Board',
    }
