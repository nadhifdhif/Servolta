<?php

return [
    // Masa berlaku token login (hari). Setelah itu pengguna harus masuk lagi.
    'token_days' => (int) env('AUTH_TOKEN_DAYS', 7),

    // Akun dikunci sementara setelah sekian kali salah sandi beruntun.
    'lockout_attempts' => (int) env('LOCKOUT_ATTEMPTS', 10),
    'lockout_minutes' => (int) env('LOCKOUT_MINUTES', 15),

    // Tolak sandi yang pernah bocor. Butuh koneksi internet dari server; aktifkan di produksi.
    'check_breached_passwords' => (bool) env('PASSWORD_CHECK_BREACHED', false),
];
