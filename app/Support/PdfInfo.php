<?php

namespace App\Support;

final class PdfInfo
{
    /** PDF sah diawali "%PDF-" (boleh ada sedikit sampah di awal file). */
    public static function isPdf(string $path): bool
    {
        $head = @file_get_contents($path, false, null, 0, 1024);

        return is_string($head) && str_contains($head, '%PDF-');
    }

    /**
     * Perkiraan jumlah halaman dengan menghitung objek /Type /Page.
     * Bisa null untuk PDF yang menyimpan objek terkompresi; angka itu hanya info tambahan.
     */
    public static function pageCount(string $path): ?int
    {
        $contents = @file_get_contents($path);
        if (! is_string($contents)) {
            return null;
        }
        $count = preg_match_all('/\/Type\s*\/Page(?![a-zA-Z])/', $contents);

        return $count > 0 ? $count : null;
    }
}
