<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Akun yang dinonaktifkan langsung kehilangan akses, walau token lamanya belum kedaluwarsa
 * (misalnya dinonaktifkan lewat database, bukan lewat menu Pengguna).
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            $user->tokens()->delete();

            return response()->json(['message' => 'Akun ini dinonaktifkan. Hubungi admin.'], 401);
        }

        return $next($request);
    }
}
