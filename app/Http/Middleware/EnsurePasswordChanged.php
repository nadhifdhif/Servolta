<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Akun baru (atau yang sandinya direset admin) hanya boleh mengganti sandi, melihat dirinya,
 * dan keluar, sampai sandi sementaranya diganti.
 */
class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->must_change_password
            && ! $request->is('api/me', 'api/me/password', 'api/logout', 'api/logout-all')) {
            return response()->json([
                'message' => 'Ganti kata sandi sementara Anda terlebih dahulu.',
                'code' => 'password_change_required',
            ], 403);
        }

        return $next($request);
    }
}
