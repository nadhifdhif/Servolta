<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Satu akun uji per role. Hanya untuk lokal/testing: kata sandinya "password".
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->warn('UserSeeder dilewati: hanya untuk environment local/testing.');

            return;
        }

        foreach (UserRole::cases() as $role) {
            $user = User::query()->firstOrNew(['email' => "{$role->value}@servolta.test"]);

            $user->forceFill([
                'name' => $role->label(),
                'password' => 'password', // di-hash otomatis oleh cast 'hashed'
                'role' => $role,
                'is_active' => true,
            ])->save();
        }
    }
}
