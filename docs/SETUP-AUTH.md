# Menyiapkan auth backend: masuk sebagai Admin dulu

Tujuan: backend berjalan, Anda bisa **masuk sebagai Admin**, lalu mendaftarkan pengguna lain lewat halaman Pengguna.
Paket ini berlaku di atas backend yang sudah memuat modul data (produk, FAQ, wiring, datasheet, upselling), jadi tidak ada fitur yang hilang.

## 0. Sebelum mulai
- PostgreSQL menyala dan `.env` sudah benar (`DB_CONNECTION=pgsql`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).
- Cabang kerja sementara, supaya mudah dibatalkan: `git switch -c wip/auth-kode`.
- Laravel Sanctum terpasang (`php artisan install:api`, jawab **no** untuk migrasi) dan `bootstrap/app.php` memuat baris `api: __DIR__.'/../routes/api.php'`. Skrip di langkah 2 memeriksa keduanya.

## 1. Pasang paket
```bash
cd ~/Servolta
unzip -o /mnt/c/Users/HP/Downloads/servolta-backend-auth-siap.zip -d .
```

## 2. Periksa dan siapkan
```bash
bash scripts/setup-auth.sh
```
Skrip ini tidak menjalankan migrasi dan tidak menghapus data. Ia memeriksa PHP, Sanctum, rute API, dan berkas paket, serta menambahkan pengaturan `.env` yang belum ada
(`AUTH_TOKEN_DAYS`, `CORS_ALLOWED_ORIGINS`, `LOCKOUT_ATTEMPTS`, `LOCKOUT_MINUTES`, `PASSWORD_CHECK_BREACHED`) tanpa menimpa nilai Anda.
Tanda `[!!]` berarti ada yang perlu diperbaiki sebelum lanjut. Jika skrip membuat `bootstrap/app.php.bak`, hapus setelah memeriksa dan jangan di-commit.

## 3. Database: pilih satu
| Pilihan | Perintah | Hasil |
| --- | --- | --- |
| **A. Bersih** (disarankan untuk mulai) | `php artisan migrate:fresh` | Semua tabel dibuat ulang tanpa data. Tidak ada akun contoh. Produk dan FAQ kosong. |
| **B. Pertahankan data** | `php artisan migrate` | Data tetap. Akun lama otomatis diberi kode (`admin@servolta.test` menjadi `ADMIN01`, dan seterusnya), `superadmin` menjadi `admin`. Sandi lama tetap `password`. |
| **C. Demo** | `php artisan migrate:fresh --seed` | Bersih lalu diisi akun contoh (`ADMIN01`, `SPV01`, ... sandi `password`) dan produk, FAQ, saran contoh. Hanya berjalan di environment `local`. |

`migrate:fresh` **menghapus semua data**. Jangan dipakai bila ada data yang ingin dipertahankan.

## 4. Buat akun Admin Anda
```bash
php artisan servolta:create-admin
```
Kode login dibuat acak dan ditampilkan (catat!), sandi ditanyakan tanpa tampil di layar (minimal 10 karakter).
Pilihan lain: `php artisan servolta:create-admin KODE0001 --name="Nama Anda" --employee-id=12345`.
Bila kode sudah ada, akun itu dijadikan Admin, diaktifkan, dan dibuka kuncinya.

## 5. Jalankan API dan uji tanpa frontend
```bash
php artisan serve                                   # terminal 1
bash scripts/cek-auth.sh http://localhost:8000 KODE_ADMIN_ANDA   # terminal 2 (sandi ditanyakan)
```
Hasil yang benar: semua baris `[lulus]` dan "Backend auth siap". Skrip ini hanya login, membaca, dan logout; tidak mengubah data.

Periksa juga isi databasenya:
```bash
PGPASSWORD='SANDI_DB' psql -h 127.0.0.1 -U servolta -d servolta -c \
 "select id,name,login_code,role,is_active,must_change_password from users order by id;"
PGPASSWORD='SANDI_DB' psql -h 127.0.0.1 -U servolta -d servolta -c \
 "select login_code,success,reason,created_at from login_attempts order by id desc limit 5;"
```

## 6. Tes otomatis
```bash
php artisan test
DB_CONNECTION=pgsql DB_DATABASE=servolta_test DB_USERNAME=servolta DB_PASSWORD='SANDI_DB' php artisan test
```

## 7. Sambungkan frontend
Di `~/servolta-fe`, `.env.development`:
```
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000/api
```
Restart `npm run dev`, buka alamat yang tercetak, lalu masuk dengan kode Admin Anda. Frontend yang mendukung login dengan kode adalah paket `servolta-frontend-v10-kode.zip`.
Jika Vite memakai port selain 5173, tambahkan alamatnya ke `CORS_ALLOWED_ORIGINS` di `.env` backend.

## 8. Mendaftarkan pengguna lain
1. Masuk sebagai Admin, buka **Pengguna**, klik **Tambah pengguna**.
2. Kode login dan kata sandi sementara sudah terisi acak (tombol **Acak** membuat yang baru). Pilih role, isi nama, simpan.
3. Kartu kredensial muncul **sekali**: salin lalu berikan kepada orangnya lewat jalur yang aman.
4. Saat masuk pertama, orang itu wajib mengganti kata sandinya.
5. Akun terkunci (10 kali salah sandi) bisa dibuka lewat tombol **Buka kunci**.

Admin dapat membuat semua role. Supervisor hanya TS, MO, CS, Sales and Data, Content and Branding, dan Intern.

## 9. Membersihkan akun contoh
Pada pilihan B atau C ada akun contoh dengan sandi `password`. Setelah akun Anda berjalan, hapus semuanya dari halaman Pengguna. Seeder akun uji tidak pernah berjalan di produksi.

## Jika ada masalah
| Gejala | Penyebab dan langkah |
| --- | --- |
| `Target class [...] does not exist` | Berkas modul data belum ada. Pasang paket modul data lebih dulu. `setup-auth.sh` menandainya. |
| `could not find driver` | Ekstensi `pdo_pgsql` tidak aktif di PHP. |
| Error 500 | Lihat 30 baris terakhir `storage/logs/laravel.log`. |
| Login 422 padahal kode benar | Sandi salah, atau `migrate` belum dijalankan (kolom `login_code` belum ada). |
| Login 429 | Pembatas login (5 per menit per kode dan IP). Tunggu semenit. |
| Browser menolak (CORS) | Tambahkan alamat frontend ke `CORS_ALLOWED_ORIGINS`, lalu `php artisan config:clear`. |
| Migrasi gagal di tengah | Kirim pesan lengkapnya. Jangan jalankan `migrate:fresh` bila ada data yang penting. |

Ringkasan keamanan dan semua aturan auth ada di `docs/AUTH.md`.
