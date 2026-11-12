<?php

namespace App\Support;

/**
 * Kode login pengganti email. Bukan rahasia (sama seperti nama pengguna): keamanan akun datang dari
 * kata sandi, pembatas percobaan, dan penguncian. Kode acak hanya membuatnya sulit ditebak dari
 * pola yang dikenal (email perusahaan, nomor karyawan berurutan).
 */
final class LoginCode
{
    /** Tanpa huruf/angka yang mudah tertukar (I, L, O, 0, 1). */
    public const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    /** Format yang diterima: huruf besar dan angka, 4 sampai 20 karakter. */
    public const PATTERN = '/^[A-Z0-9]{4,20}$/';

    public static function generate(int $length = 8): string
    {
        $max = strlen(self::ALPHABET) - 1;
        $code = '';
        for ($i = 0; $i < $length; $i++) {
            $code .= self::ALPHABET[random_int(0, $max)];
        }

        return $code;
    }

    public static function normalize(?string $value): string
    {
        return strtoupper(trim((string) $value));
    }

    public static function isValid(string $code): bool
    {
        return preg_match(self::PATTERN, $code) === 1;
    }
}
