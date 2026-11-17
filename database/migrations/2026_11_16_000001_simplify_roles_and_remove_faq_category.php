<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 1) Role disederhanakan menjadi empat: admin, spv, staff, intern.
 *    ts, mo, cs, sales, konten dilebur menjadi staff.
 * 2) Kategori FAQ (cs/ts) dihapus: semua FAQ berdiri sendiri per produk.
 *
 * Aman dijalankan ulang: setiap langkah memeriksa kondisi sebelum mengubah.
 */
return new class extends Migration
{
    private const OLD_STAFF_ROLES = ['ts', 'mo', 'cs', 'sales', 'konten'];

    private const NEW_ROLES = "'admin','spv','staff','intern'";

    private const ALL_ROLES_BEFORE = "'admin','spv','ts','mo','cs','sales','konten','intern'";

    public function up(): void
    {
        // --- Role ---
        // Di PostgreSQL batasan lama dilepas dulu supaya nilai 'staff' boleh masuk.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        }

        DB::table('users')->whereIn('role', self::OLD_STAFF_ROLES)->update(['role' => 'staff']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('.self::NEW_ROLES.'))');
        }

        // --- Kategori FAQ ---
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE faqs DROP CONSTRAINT IF EXISTS faqs_category_check');
        }

        if (Schema::hasIndex('faqs', ['product_id', 'category'])) {
            Schema::table('faqs', fn (Blueprint $table) => $table->dropIndex(['product_id', 'category']));
        }

        if (Schema::hasColumn('faqs', 'category')) {
            Schema::table('faqs', fn (Blueprint $table) => $table->dropColumn('category'));
        }

        // Indeks gabungan tadi ikut melayani pencarian per produk; gantikan dengan indeks product_id.
        if (! Schema::hasIndex('faqs', ['product_id'])) {
            Schema::table('faqs', fn (Blueprint $table) => $table->index('product_id'));
        }
    }

    public function down(): void
    {
        // Kategori dikembalikan sebagai 'cs' untuk semua FAQ: nilai aslinya sudah hilang.
        if (! Schema::hasColumn('faqs', 'category')) {
            Schema::table('faqs', fn (Blueprint $table) => $table->string('category', 2)->default('cs')->after('product_id'));
        }

        if (Schema::hasIndex('faqs', ['product_id'])) {
            Schema::table('faqs', fn (Blueprint $table) => $table->dropIndex(['product_id']));
        }

        Schema::table('faqs', fn (Blueprint $table) => $table->index(['product_id', 'category']));

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE faqs ADD CONSTRAINT faqs_category_check CHECK (category IN ('cs','ts'))");
        }

        // Akun staff tidak dikembalikan ke jabatan lama; hanya batasan database yang dilonggarkan.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement(
                'ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('.self::ALL_ROLES_BEFORE.",'staff'))"
            );
        }
    }
};
