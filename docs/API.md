# API Servolta

Semua endpoint (kecuali `POST /api/login`) memakai header `Authorization: Bearer <token>` dan mengembalikan JSON.
Kesalahan validasi: `422 { "message": "...", "errors": { "kolom": ["pesan"] } }`.

| Method | Endpoint | Keterangan | Akses |
| --- | --- | --- | --- |
| POST | `/api/login` | Masuk, mengembalikan token | Publik (maks. 5x/menit) |
| POST | `/api/logout` | Keluar | Login |
| GET | `/api/me` | Pengguna saat ini + `permissions` | Login |
| GET | `/api/overview` | `{faq, products, wiring, datasheet}` | Login |
| GET | `/api/products` | Daftar produk `{id, sku, name}` urut SKU | Login |
| POST | `/api/products` | Tambah produk (`sku`, `name`); SKU diubah ke huruf besar | `write_products` |
| PUT | `/api/products/{id}` | Ubah produk | `write_products` |
| DELETE | `/api/products/{id}` | Hapus produk beserta FAQ dan file-nya | `write_products` |
| PUT | `/api/products/{id}/specs` | Ganti spesifikasi: `{specs: [{label, value}]}` | `write_products` |
| GET | `/api/products/{id}/faqs` | FAQ produk | Login |
| POST | `/api/products/{id}/faqs` | Tambah FAQ (`category` cs/ts, `question`, `answer`) | `write_faq` |
| PUT | `/api/faqs/{id}` | Ubah FAQ | `write_faq` |
| DELETE | `/api/faqs/{id}` | Hapus FAQ (204) | `write_faq` |
| GET | `/api/products/{id}/selling` | Saran upselling & cross selling produk, lengkap dengan `target {id, sku, name}` | Login |
| POST | `/api/products/{id}/selling` | Tambah saran: `type` (`upsell`/`cross`), `target_id`, `pitch` (maks. 1000) | `write_selling` |
| PUT | `/api/selling/{id}` | Ubah saran | `write_selling` |
| DELETE | `/api/selling/{id}` | Hapus saran (204) | `write_selling` |
| GET | `/api/products/{id}/wiring` | Daftar gambar wiring | Login |
| GET | `/api/wiring/{id}/file` | Isi gambar (biner, butuh token) | Login |
| POST | `/api/products/{id}/wiring` | Unggah gambar (multipart: `title`, `rev`, `file`) | `write_products` |
| DELETE | `/api/wiring/{id}` | Hapus gambar (204) | `write_products` |
| GET | `/api/products/{id}/datasheet` | `{specs: [[label, nilai]], documents: [...]}` | Login |
| GET | `/api/datasheet-documents/{id}/file` | Isi PDF (biner, butuh token) | Login |
| POST | `/api/products/{id}/datasheet-documents` | Unggah PDF (multipart: `title`, `rev`, `kind`, `file`) | `write_products` |
| DELETE | `/api/datasheet-documents/{id}` | Hapus dokumen (204) | `write_products` |

Hak akses: `write_faq` dan `write_selling` = semua role kecuali intern (dibuat terpisah supaya mudah dibedakan bila aturan role berubah). `write_products` = spv, admin, superadmin.

Aturan saran: produk tujuan harus ada dan tidak boleh sama dengan produk asal; satu tujuan hanya sekali per jenis untuk produk yang sama.

## File
- Disimpan di disk `local` (privat, `storage/app/private`), tanpa URL publik.
- Gambar wiring: JPG, PNG, WebP, GIF, SVG, HEIC, BMP, TIFF, AVIF, maks. 15 MB. Diputar sesuai EXIF, metadata/GPS dibuang,
  sisi terpanjang dibatasi 2400 px. HEIC/TIFF/AVIF diubah ke JPG bila ekstensi Imagick terpasang; tanpa Imagick,
  HEIC/TIFF ditolak dengan pesan yang jelas.
- SVG ditolak bila berisi skrip, event handler, foreignObject, atau referensi luar.
- Datasheet: PDF saja, maks. 20 MB, isi diperiksa (`%PDF-`).
- Batas PHP harus dinaikkan: `upload_max_filesize=20M`, `post_max_size=25M`; di nginx `client_max_body_size 25m;`.
