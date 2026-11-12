<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use App\Support\LoginCode;
use App\Support\PasswordPolicy;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateAdmin extends Command
{
    protected $signature = 'servolta:create-admin
        {code? : Kode login. Bila kosong, dibuat acak dan ditampilkan}
        {--name= : Nama tampilan (bawaan: Admin)}
        {--employee-id= : ID karyawan (angka, opsional)}
        {--password= : Kata sandi. Bila kosong, akan ditanyakan tanpa tampil di layar}';

    protected $description = 'Membuat akun Admin (atau menjadikan akun yang ada sebagai Admin). Dipakai untuk akun pertama di server.';

    public function handle(): int
    {
        $code = LoginCode::normalize($this->argument('code')) ?: LoginCode::generate();
        $password = $this->option('password') ?: $this->secret('Kata sandi (minimal '.PasswordPolicy::MIN_LENGTH.' karakter)');
        $employeeId = $this->option('employee-id');

        $validator = Validator::make(
            ['code' => $code, 'password' => $password, 'employee_id' => $employeeId],
            [
                'code' => ['required', 'regex:'.LoginCode::PATTERN],
                'password' => ['required', PasswordPolicy::rule()],
                'employee_id' => ['nullable', 'integer', 'min:1'],
            ],
            ['code.regex' => 'Kode hanya boleh huruf besar dan angka, 4 sampai 20 karakter.'],
        );
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $user = User::query()->firstOrNew(['login_code' => $code]);
        $exists = $user->exists;

        $user->forceFill([
            'name' => $this->option('name') ?: ($exists ? $user->name : 'Admin'),
            'employee_id' => $employeeId !== null && $employeeId !== '' ? (int) $employeeId : $user->employee_id,
            'password' => $password, // di-hash oleh cast 'hashed'
            'role' => UserRole::Admin,
            'is_active' => true,
            'must_change_password' => false,
            'failed_logins' => 0,
            'locked_until' => null,
        ])->save();

        $this->info($exists ? "Akun {$code} diperbarui menjadi Admin." : "Akun Admin dibuat. Kode masuk: {$code}");

        return self::SUCCESS;
    }
}
