# API Servolta

Semua endpoint (kecuali `POST /api/login`) memakai header `Authorization: Bearer <token>` dan mengembalikan JSON.
Kesalahan validasi: `422 { "message": "...", "errors": { "kolom": ["pesan"] } }`.

| Method | Endpoint | Keterangan | Akses |
| --- | --- | --- | --- |
| POST | `/api/login` | Masuk dengan `code` + `password`, mengembalikan token | Publik (5x/menit per kode+IP) |
| POST | `/api/logout` | Keluar | Login |
| GET | `/api/me` | Pengguna saat ini + `permissions` | Login |
| PUT | `/api/me` | Ubah nama sendiri | Login |
| PUT | `/api/me/password` | Ganti kata sandi sendiri (`current_password`, `password`, `password_confirmation`) | Login |
| POST | `/api/logout-all` | Keluar dari semua perangkat | Login |
| GET | `/api/users` | Daftar pengguna yang boleh dikelola peminta (admin: semua; supervisor: staf di bawahnya) | `manage_users` |
| POST | `/api/users` | Tambah pengguna: `name`, `login_code` (kosong = dibuat acak), `employee_id` (opsional), `role`, `password` (min. 10), `is_active` | `manage_users` |
| PUT | `/api/users/{id}` | Ubah pengguna; `password` boleh kosong (tidak diganti). Sesi lama dicabut bila sandi/role berubah atau akun dinonaktifkan | `manage_users` |
| POST | `/api/users/{id}/unlock` | Buka kunci akun yang terkunci karena salah sandi berulang | `manage_users` |
| GET | `/api/login-attempts` | Riwayat percobaan masuk terbaru (maks. 200), filter `?success=0` atau `1` | `view_logs` (Admin) |
| DELETE | `/api/users/{id}` | Hapus pengguna (204). Akun sendiri tidak bisa diubah atau dihapus dari sini | `manage_users` |
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

Hak akses (delapan role: admin, spv, ts, mo, cs, sales, konten, intern):
- `write_faq`, `write_selling`, `write_products` (SKU, spesifikasi, wiring, datasheet): semua role kecuali intern. Intern hanya melihat.
- `view_logs`: hanya admin.
- `manage_users`: admin (semua role) dan spv (hanya ts, mo, cs, sales, konten, intern).
- Label tampilan: `sales` = Sales and Data, `konten` = Content and Branding.

Aturan saran: produk tujuan harus ada dan tidak boleh sama dengan produk asal; satu tujuan hanya sekali per jenis untuk produk yang sama.

## File
- Disimpan di disk `local` (privat, `storage/app/private`), tanpa URL publik.
- Gambar wiring: JPG, PNG, WebP, GIF, SVG, HEIC, BMP, TIFF, AVIF, maks. 15 MB. Diputar sesuai EXIF, metadata/GPS dibuang,
  sisi terpanjang dibatasi 2400 px. HEIC/TIFF/AVIF diubah ke JPG bila ekstensi Imagick terpasang; tanpa Imagick,
  HEIC/TIFF ditolak dengan pesan yang jelas.
- SVG ditolak bila berisi skrip, event handler, foreignObject, atau referensi luar.
- Datasheet: PDF saja, maks. 20 MB, isi diperiksa (`%PDF-`).
- Batas PHP harus dinaikkan: `upload_max_filesize=20M`, `post_max_size=25M`; di nginx `client_max_body_size 25m;`.

## Akun pertama di server
```bash
php artisan servolta:create-admin email@perusahaan.com --name="Nama Admin"   # sandi ditanyakan tanpa tampil
```
Bila email sudah ada, akun itu dijadikan Admin dan diaktifkan. Seeder akun uji tidak berjalan di produksi.

Rincian autentikasi: lihat `docs/AUTH.md`.
