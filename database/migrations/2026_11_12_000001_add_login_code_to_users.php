<?php

use App\Support\LoginCode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('login_code', 20)->nullable()->unique()->after('name');
            $table->unsignedInteger('employee_id')->nullable()->unique()->after('login_code');
            $table->boolean('must_change_password')->default(false)->after('is_active');
            $table->unsignedSmallInteger('failed_logins')->default(0)->after('must_change_password');
            $table->timestamp('locked_until')->nullable()->after('failed_logins');
        });

        // Email tidak lagi dipakai untuk masuk. Kolomnya dibiarkan (boleh kosong) agar migrasi ini
        // mudah dibatalkan; hapus kolomnya nanti bila sudah yakin tidak ada yang memakainya.
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
        });

        // Akun yang sudah ada diberi kode. Akun contoh {role}@servolta.test mendapat kode {ROLE}01
        // (sama dengan UserSeeder); lainnya mendapat kode acak.
        foreach (DB::table('users')->whereNull('login_code')->get(['id', 'email']) as $user) {
            if (preg_match('/^([a-z]+)@servolta\.test$/', (string) $user->email, $m)) {
                $code = strtoupper($m[1]).'01';
            } else {
                do {
                    $code = LoginCode::generate();
                } while (DB::table('users')->where('login_code', $code)->exists());
            }
            DB::table('users')->where('id', $user->id)->update(['login_code' => $code]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['login_code']);
            $table->dropUnique(['employee_id']);
            $table->dropColumn(['login_code', 'employee_id', 'must_change_password', 'failed_logins', 'locked_until']);
        });
    }
};
