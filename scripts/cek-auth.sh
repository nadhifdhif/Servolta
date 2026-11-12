#!/usr/bin/env bash
# Uji cepat API login Servolta, tanpa frontend. Hanya membaca dan login; tidak mengubah data.
# Pemakaian:  bash scripts/cek-auth.sh [URL] [KODE]
#   URL  bawaan http://localhost:8000
#   KODE bawaan ADMIN01 (akun seeder). Kata sandi ditanyakan tanpa tampil (atau isi variabel SANDI).
set -u
URL="${1:-http://localhost:8000}"
KODE="${2:-ADMIN01}"
URL="${URL%/}"
PASS=0; FAIL=0

if [ -z "${SANDI:-}" ]; then
  read -r -s -p "Kata sandi untuk $KODE: " SANDI; echo
fi

pass() { printf '  [lulus] %s\n' "$*"; PASS=$((PASS + 1)); }
fail() { printf '  [GAGAL] %s\n' "$*"; FAIL=$((FAIL + 1)); }
info() { printf '  [info]  %s\n' "$*"; }

# request METODE PATH [token] [json]  -> menaruh isi di $BODY dan kode HTTP di $CODE
request() {
  local method="$1" path="$2" token="${3:-}" data="${4:-}"
  local args=(-s -o /tmp/servolta_cek_body -w '%{http_code}' -X "$method" "$URL/api$path" -H 'Accept: application/json')
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data" ] && args+=(-H 'Content-Type: application/json' -d "$data")
  CODE=$(curl "${args[@]}" 2>/dev/null) || CODE=000
  BODY=$(cat /tmp/servolta_cek_body 2>/dev/null)
}
json() { python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
    for k in sys.argv[1].split('.'):
        d=d[int(k)] if isinstance(d,list) else d[k]
    print(d)
except Exception:
    print('')" "$1" <<<"$BODY"; }

echo "Menguji $URL dengan kode $KODE"
echo

request GET /me
if [ "$CODE" = "000" ]; then
  fail "tidak bisa terhubung ke $URL. Apakah 'php artisan serve' berjalan?"
  echo; echo "Hasil: $PASS lulus, $FAIL gagal"; exit 1
fi
[ "$CODE" = "401" ] && pass "tanpa token ditolak (401)" || fail "tanpa token seharusnya 401, dapat $CODE"

request POST /login "" "{\"code\":\"$KODE\",\"password\":\"__salah__\"}"
if [ "$CODE" = "422" ] && [ -n "$(json errors.code.0)" ]; then pass "sandi salah ditolak (422) dengan pesan: $(json errors.code.0)"; else fail "sandi salah seharusnya 422 dengan errors.code, dapat $CODE"; fi

request POST /login "" "{\"code\":\"$KODE\",\"password\":\"$SANDI\"}"
if [ "$CODE" = "429" ]; then fail "terkena pembatas login (429). Tunggu semenit lalu ulangi"; echo; echo "Hasil: $PASS lulus, $FAIL gagal"; exit 1; fi
TOKEN=$(json token)
if [ "$CODE" = "200" ] && [ -n "$TOKEN" ]; then
  pass "login berhasil (200), token diterima"
else
  fail "login gagal (HTTP $CODE): $(json errors.code.0)"
  echo "  Petunjuk: cek kode dan kata sandi, dan pastikan 'php artisan migrate' sudah dijalankan."
  echo; echo "Hasil: $PASS lulus, $FAIL gagal"; exit 1
fi

[ -n "$(json user.login_code)" ] && pass "data user memuat login_code: $(json user.login_code)" || fail "respons login tidak memuat user.login_code"
[ -z "$(json user.email)" ] && pass "email tidak ikut dikirim" || fail "respons login masih memuat email"
ROLE=$(json user.role); [ -n "$ROLE" ] && pass "role: $ROLE" || fail "respons login tidak memuat role"
MUST=$(json user.must_change_password); info "must_change_password: ${MUST:-?}"

request GET /me "$TOKEN"
[ "$CODE" = "200" ] && pass "GET /me dengan token berhasil (200)" || fail "GET /me seharusnya 200, dapat $CODE"

request GET /users "$TOKEN"
case "$ROLE" in
  admin|spv) [ "$CODE" = "200" ] && pass "GET /users berhasil: akun $ROLE boleh mengelola pengguna" || fail "GET /users seharusnya 200 untuk $ROLE, dapat $CODE";;
  *)         [ "$CODE" = "403" ] && pass "GET /users ditolak (403): role $ROLE memang tidak boleh" || fail "GET /users seharusnya 403 untuk $ROLE, dapat $CODE";;
esac

request POST /logout "$TOKEN"
[ "$CODE" = "200" ] && pass "logout berhasil (200)" || fail "logout seharusnya 200, dapat $CODE"
request GET /me "$TOKEN"
[ "$CODE" = "401" ] && pass "token tidak berlaku lagi setelah logout (401)" || fail "setelah logout /me seharusnya 401, dapat $CODE"

echo
echo "Hasil: $PASS lulus, $FAIL gagal"
[ "$FAIL" -eq 0 ] && echo "Backend auth siap. Lanjutkan dengan menyambungkan frontend." || echo "Ada yang gagal. Kirim keluaran ini ke saya beserta storage/logs/laravel.log bagian terakhir."
rm -f /tmp/servolta_cek_body
[ "$FAIL" -eq 0 ]
