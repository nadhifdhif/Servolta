<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Satu akun uji per role. Hanya untuk lokal/testing.
     * Kode masuk: {ROLE}01 (ADMIN01, SPV01, TS01, MO01, CS01, SALES01, KONTEN01, INTERN01); kata sandi: "password".
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->warn('UserSeeder dilewati: hanya untuk environment local/testing.');

            return;
        }

        foreach (UserRole::cases() as $role) {
            $user = User::query()->firstOrNew(['login_code' => strtoupper($role->value).'01']);

            $user->forceFill([
                'name' => $role->label(),
                'password' => 'password', // di-hash otomatis oleh cast 'hashed'
                'role' => $role,
                'is_active' => true,
                'must_change_password' => false,
            ])->save();
        }
    }
}
