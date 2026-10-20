# Servolta

Aplikasi internal untuk membantu tim **Customer Service** dan **Technical Support** menemukan jawaban FAQ dengan cepat saat membalas chat customer.

Cukup pilih/ketik **SKU** atau **nama barang** (dropdown + rekomendasi nama terdekat), lalu daftar FAQ untuk produk tersebut langsung tampil dan siap disalin.

## Fitur

- Login / logout (token-based)
- Pencarian produk berdasarkan SKU atau nama, dengan saran nama terdekat (typo-tolerant)
- Daftar FAQ per produk, dengan tombol salin jawaban
- CRUD Produk dan FAQ (khusus role yang berwenang)
- Role: `admin`, `customer_service`, `technical_support`

## Tech Stack

| Bagian   | Teknologi                                              |
| -------- | ------------------------------------------------------ |
| Frontend | Vue 3 + Vite, Vue Router, Pinia, Axios                 |
| Backend  | Laravel 11, Laravel Sanctum (auth)                     |
| Database | PostgreSQL                                             |

## Struktur Repo (rencana)

```
Servolta/
├── frontend/   # Vue 3 (Vite)
├── backend/    # Laravel API
└── README.md
```

## Prasyarat di Laptop

| Tool     | Versi minimal | Cek                |
| -------- | ------------- | ------------------ |
| Node.js  | 20 LTS        | `node -v`          |
| npm      | 10            | `npm -v`           |
| PHP      | 8.2           | `php -v`           |
| Composer | 2.x           | `composer -V`      |
| Git      | terbaru       | `git --version`    |

## Setup Frontend (Vue.js)

```bash
git clone https://github.com/nadhifdhif/servolta.git
cd servolta

# buat project Vue 3
npm create vue@latest frontend
# pilih: Router = Yes, Pinia = Yes, ESLint = Yes, Prettier = Yes, lainnya No

cd frontend
npm install axios
npm install
npm run dev
```

Buka http://localhost:5173 — jika halaman Vue muncul, konfigurasi frontend sudah benar.

Buat file `frontend/.env`:

```
VITE_API_URL=http://localhost:8000/api
```

## Setup Backend (Laravel)

```bash
cd servolta
composer create-project laravel/laravel backend
cd backend
php artisan install:api      # memasang Sanctum
cp .env.example .env         # jika belum ada
php artisan key:generate
php artisan migrate
php artisan serve            # http://localhost:8000
```

Atur CORS agar mengizinkan `http://localhost:5173` (`config/cors.php`).

## Rencana API

| Method | Endpoint                         | Keterangan                                   | Akses        |
| ------ | -------------------------------- | -------------------------------------------- | ------------ |
| POST   | `/api/login`                     | Login, mengembalikan token                   | Publik       |
| POST   | `/api/logout`                    | Logout                                       | Login        |
| GET    | `/api/me`                        | Data user saat ini                           | Login        |
| GET    | `/api/products?q=`               | Dropdown + rekomendasi produk (SKU / nama)   | Login        |
| GET    | `/api/products/{id}/faqs`        | Daftar FAQ untuk satu produk                 | Login        |
| POST/PUT/DELETE | `/api/products`, `/api/faqs` | CRUD produk dan FAQ                    | Admin        |

## Model Data (rencana)

- `users`: name, email, password, role
- `products`: sku (unik), name, description
- `faqs`: product_id, category (`customer_service` / `technical_support`), question, answer
