#!/usr/bin/env bash
# Memeriksa dan menyiapkan backend Servolta untuk autentikasi (login dengan kode).
# Aman dijalankan berulang. Skrip ini TIDAK menjalankan migrasi dan TIDAK menghapus data:
# ia hanya memeriksa, menambahkan baris .env yang belum ada, dan menampilkan langkah berikutnya.
#
# Pemakaian (dari folder Laravel):   bash scripts/setup-auth.sh
set -u
cd "$(dirname "$0")/.." || exit 1

PROBLEMS=0
ok()   { printf '  [ok] %s\n' "$*"; }
warn() { printf '  [!!] %s\n' "$*"; PROBLEMS=$((PROBLEMS + 1)); }
info() { printf '  [..] %s\n' "$*"; }

echo "Memeriksa backend Servolta di: $(pwd)"
echo

[ -f artisan ] || { echo "Folder ini bukan proyek Laravel (artisan tidak ada). Jalankan dari ~/Servolta."; exit 1; }

echo "1. PHP dan ekstensi"
if command -v php >/dev/null 2>&1; then ok "PHP $(php -r 'echo PHP_VERSION;')"; else warn "php tidak ditemukan"; fi
for ext in pdo_pgsql mbstring fileinfo gd; do
  if php -m 2>/dev/null | grep -qix "$ext"; then ok "ekstensi $ext"; else
    case "$ext" in
      gd) info "ekstensi gd tidak ada (hanya perlu untuk gambar wiring dan tes unggah)";;
      *)  warn "ekstensi $ext tidak ada";;
    esac
  fi
done

echo
echo "2. Laravel Sanctum (token login)"
if grep -q '"laravel/sanctum"' composer.json 2>/dev/null; then ok "Sanctum ada di composer.json"; else
  warn "Sanctum belum terpasang. Jalankan: php artisan install:api   (jawab 'no' untuk pertanyaan migrasi)"
fi

echo
echo "3. Rute API di bootstrap/app.php"
if [ -f bootstrap/app.php ]; then
  if grep -q "api: __DIR__" bootstrap/app.php; then ok "rute API sudah terdaftar"; else
    cp bootstrap/app.php bootstrap/app.php.bak
    sed -i "s#^\(\s*\)web: __DIR__.'/../routes/web.php',#&\n\1api: __DIR__.'/../routes/api.php',#" bootstrap/app.php
    if grep -q "api: __DIR__" bootstrap/app.php; then
      ok "baris 'api: ...' ditambahkan (cadangan: bootstrap/app.php.bak, hapus setelah diperiksa dan jangan di-commit)"
    else
      mv bootstrap/app.php.bak bootstrap/app.php 2>/dev/null
      warn "gagal menambah otomatis. Tambahkan manual di ->withRouting(...):  api: __DIR__.'/../routes/api.php',"
    fi
  fi
else
  warn "bootstrap/app.php tidak ditemukan"
fi

echo
echo "4. Berkas .env"
if [ ! -f .env ]; then
  warn ".env belum ada. Jalankan: cp .env.example .env && php artisan key:generate"
else
  grep -q '^APP_KEY=.\+' .env && ok "APP_KEY terisi" || warn "APP_KEY kosong. Jalankan: php artisan key:generate"
  DBC=$(grep '^DB_CONNECTION=' .env | head -1 | cut -d= -f2)
  info "DB_CONNECTION=${DBC:-<belum diatur>}"
  [ "$DBC" = "pgsql" ] || info "Rencana kita memakai pgsql. SQLite boleh untuk mencoba, tetapi data tidak dipakai bersama."
  add_env() { # KUNCI NILAI: hanya menambah bila belum ada, tidak pernah menimpa
    if grep -q "^$1=" .env; then ok "$1 sudah ada ($(grep "^$1=" .env | head -1))"; else echo "$1=$2" >> .env; ok "$1=$2 ditambahkan"; fi
  }
  add_env AUTH_TOKEN_DAYS 7
  add_env CORS_ALLOWED_ORIGINS http://localhost:5173,http://127.0.0.1:5173
  add_env LOCKOUT_ATTEMPTS 10
  add_env LOCKOUT_MINUTES 15
  add_env PASSWORD_CHECK_BREACHED false
fi

echo
echo "5. Berkas paket"
for f in app/Support/LoginCode.php app/Http/Controllers/AuthController.php app/Http/Controllers/UserController.php \
         app/Console/Commands/CreateAdmin.php config/servolta.php config/cors.php routes/api.php \
         database/migrations/2026_11_12_000001_add_login_code_to_users.php; do
  [ -f "$f" ] && ok "$f" || warn "$f tidak ada (paket belum di-unzip ke sini?)"
done
for f in app/Http/Controllers/ProductController.php app/Http/Controllers/FaqController.php; do
  [ -f "$f" ] || warn "$f tidak ada: paket modul data (v2) belum terpasang, rute produk dan FAQ akan error"
done

echo
if [ "$PROBLEMS" -eq 0 ]; then
  echo "Persiapan selesai tanpa masalah. Langkah berikutnya (jalankan sendiri, berurutan):"
else
  echo "Ada $PROBLEMS hal yang perlu diperbaiki (tanda [!!] di atas). Setelah itu, langkah berikutnya:"
fi
cat <<'NEXT'

  # Pilih SATU untuk database:
  php artisan migrate:fresh            # bersih: semua tabel dibuat ulang, TANPA akun/data contoh
  #   atau
  php artisan migrate                  # pertahankan data lama (akun lama otomatis diberi kode, mis. ADMIN01)

  php artisan servolta:create-admin    # buat akun Admin Anda: kode acak ditampilkan, sandi ditanyakan
  php artisan serve                    # jalankan API di http://localhost:8000

  # di terminal lain, uji login tanpa frontend:
  bash scripts/cek-auth.sh http://localhost:8000 KODE_ADMIN_ANDA

Panduan lengkap: docs/SETUP-AUTH.md
NEXT
exit 0
