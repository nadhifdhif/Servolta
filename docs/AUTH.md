# Autentikasi Servolta

## Masuk dengan kode, bukan email
Pengguna masuk dengan **kode login** dan kata sandi. Email tidak dipakai sama sekali (kolomnya dibiarkan kosong di database).

- **Kode login** (`login_code`): 4 sampai 20 karakter, huruf besar dan angka, unik, tidak peka huruf besar-kecil saat mengetik. Dibuat acak oleh sistem (8 karakter, tanpa `I L O 0 1` yang mudah tertukar) atau ditentukan Admin/Supervisor.
- **ID karyawan** (`employee_id`): angka, opsional, unik. Hanya data referensi, **tidak dipakai untuk masuk**, karena diketahui HR, atasan, dan manajemen.
- Kode itu bukan rahasia (seperti nama pengguna). Keamanan akun datang dari kata sandi, pembatas percobaan, penguncian, dan HTTPS.

## Alur
1. `POST /api/login` dengan `{ "code": "...", "password": "..." }` mengembalikan token Bearer (Laravel Sanctum). Frontend mengirim `Authorization: Bearer <token>` di setiap permintaan.
2. Token berlaku `AUTH_TOKEN_DAYS` hari (bawaan 7). Setelah itu, atau bila dicabut, API membalas `401` dan frontend mengembalikan pengguna ke halaman login.
3. Tidak ada pendaftaran publik. Akun dibuat Admin/Supervisor lewat menu Pengguna, atau akun Admin pertama lewat perintah artisan.
4. **Kata sandi sementara:** akun baru, atau akun yang sandinya direset admin, ditandai `must_change_password`. Sampai sandi diganti, semua endpoint (kecuali `/me`, `/me/password`, `/logout`, `/logout-all`) membalas `403` dengan `"code": "password_change_required"`.

## Pengaman yang aktif
| Pengaman | Aturan |
| --- | --- |
| Batas login | 5 percobaan per menit per kombinasi kode + IP, dan 60 per menit per IP. Jawaban 429 berbahasa Indonesia. |
| Penguncian akun | Setelah 10 kali salah sandi beruntun (`LOCKOUT_ATTEMPTS`), akun dikunci 15 menit (`LOCKOUT_MINUTES`). Percobaan saat terkunci tidak memperpanjang kunci. Admin/Supervisor bisa membuka kunci lewat menu Pengguna. |
| Pesan seragam | Kode tidak terdaftar, sandi salah, dan akun terkunci menghasilkan pesan dan waktu respons yang sama. |
| Kebijakan sandi | Minimal 10 karakter. Dengan `PASSWORD_CHECK_BREACHED=true`, sandi yang pernah bocor juga ditolak (server perlu akses internet). |
| Akun nonaktif | Ditolak (`401`) dan tokennya dihapus, walau dinonaktifkan lewat database. |
| Pencabutan sesi | Otomatis saat sandi diganti, role atau kode berubah, atau akun dinonaktifkan/dihapus. Ganti sandi sendiri mempertahankan sesi yang sedang dipakai. |
| Riwayat masuk | Setiap percobaan (berhasil atau gagal, beserta alasannya, IP, dan perangkat) tercatat. Hanya Admin yang bisa membaca (`GET /api/login-attempts`). Disimpan 90 hari. |
| CORS | Hanya alamat di `CORS_ALLOWED_ORIGINS` yang boleh memanggil API dari browser. |

Catatan: penguncian per akun bisa dimanfaatkan untuk mengunci orang lain dengan sengaja salah sandi (kode diketahui HR dan atasan). Dampaknya hanya 15 menit dan terlihat di riwayat masuk; pembatas IP menahan pengulangannya.

## Endpoint akun sendiri
| Method | Endpoint | Keterangan |
| --- | --- | --- |
| POST | `/api/login` | Masuk (`code`, `password`) |
| POST | `/api/logout` | Keluar dari perangkat ini |
| POST | `/api/logout-all` | Keluar dari semua perangkat |
| GET | `/api/me` | Data akun + `permissions` + `must_change_password` |
| PUT | `/api/me` | Ubah nama sendiri (kode, ID karyawan, dan role diatur admin/supervisor) |
| PUT | `/api/me/password` | `current_password`, `password`, `password_confirmation` |

## Pengaturan `.env`
```
AUTH_TOKEN_DAYS=7
CORS_ALLOWED_ORIGINS=http://localhost:5173
LOCKOUT_ATTEMPTS=10
LOCKOUT_MINUTES=15
PASSWORD_CHECK_BREACHED=false   # produksi: true
```
Bila frontend dan API disajikan dari satu domain lewat Nginx (`/api` diteruskan ke Laravel), CORS tidak terpakai sama sekali.

## Pekerjaan terjadwal
Tambahkan di `routes/console.php`:
```php
use Illuminate\Support\Facades\Schedule;

Schedule::command('sanctum:prune-expired --hours=24')->daily();
Schedule::command('model:prune', ['--model' => [\App\Models\LoginAttempt::class]])->daily();
```
Di server, jalankan scheduler dengan cron: `* * * * * cd /path/ke/servolta && php artisan schedule:run >> /dev/null 2>&1`.

## Akun Admin pertama di server
```bash
php artisan servolta:create-admin                       # kode dibuat acak dan ditampilkan; sandi ditanyakan
php artisan servolta:create-admin KODE0001 --name="Nama Admin" --employee-id=12345
```
Bila kode sudah ada, akun itu dijadikan Admin, diaktifkan, dan dibuka kuncinya. Seeder akun uji (`UserSeeder`, kode `ADMIN01`, `SPV01`, `TS01`, `MO01`, `CS01`, `SALES01`, `KONTEN01`, `INTERN01`, sandi `password`) hanya berjalan di environment `local` dan `testing`.

## Mengamankan server yang terbuka di internet
- **HTTPS wajib.** Tanpa itu kode dan sandi lewat jaringan polos.
- **Verifikasi dua langkah (TOTP)** untuk Admin dan Supervisor sangat disarankan sebelum dibuka ke internet (belum dibuat).
- Batasi lewat firewall atau layanan seperti Cloudflare bila memungkinkan; pasang `fail2ban` atau sejenisnya pada log Nginx untuk IP yang terus gagal.
- Pastikan minimal dua Admin, supaya ada yang bisa membuka kunci atau mereset sandi.

## Catatan keputusan: token di localStorage
Token disimpan di `localStorage` browser. Ini sederhana dan cukup untuk aplikasi internal, tapi artinya skrip jahat di halaman (XSS) bisa membacanya. Mitigasi: tidak ada `v-html` untuk isi buatan pengguna (gambar wiring SVG dan kode yang diwarnai sudah di-escape), dan sebaiknya Content-Security-Policy dipasang di Nginx. Bila kelak butuh keamanan lebih, Sanctum mendukung autentikasi SPA berbasis cookie (httpOnly) selama frontend dan API satu domain induk.
