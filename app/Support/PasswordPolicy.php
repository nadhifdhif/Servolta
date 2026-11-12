<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

final class PasswordPolicy
{
    public const MIN_LENGTH = 10;

    /**
     * Minimal 10 karakter. Bila PASSWORD_CHECK_BREACHED=true, sandi yang pernah bocor
     * (daftar publik haveibeenpwned, hanya awalan hash yang dikirim) juga ditolak.
     */
    public static function rule(): Password
    {
        $rule = Password::min(self::MIN_LENGTH);

        return config('servolta.check_breached_passwords') ? $rule->uncompromised() : $rule;
    }
}
