<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const ROLES = "'admin','spv','ts','mo','cs','sales','konten','intern'";

    public function up(): void
    {
        // Superadmin digabung ke Admin (Admin kini role tertinggi).
        DB::table('users')->where('role', 'superadmin')->update(['role' => 'admin']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement('ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('.self::ROLES.'))');
        }
    }

    public function down(): void
    {
        // Akun yang sudah menjadi Admin tidak dikembalikan; hanya batasan database yang dilonggarkan.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement(
                'ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('.self::ROLES.",'superadmin'))"
            );
        }
    }
};
