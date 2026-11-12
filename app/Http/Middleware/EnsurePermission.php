<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pemakaian di rute: ->middleware(EnsurePermission::class.':write_faq')
 * Aturannya satu sumber dengan UserRole (dan `permissions` yang dikirim ke FE).
 */
class EnsurePermission
{
    private const MESSAGES = [
        'write_faq' => 'Role Anda tidak boleh mengubah FAQ.',
        'view_logs' => 'Hanya Admin yang boleh melihat riwayat masuk.',
        'manage_users' => 'Role Anda tidak boleh mengelola pengguna.',
        'write_selling' => 'Role Anda tidak boleh mengubah upselling dan cross selling.',
        'write_products' => 'Role Anda tidak boleh mengelola produk dan dokumen.',
    ];

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $role = $request->user()?->role;

        $allowed = match ($permission) {
            'write_faq' => $role?->canWriteFaq() ?? false,
            'write_selling' => $role?->canWriteSelling() ?? false,
            'manage_users' => $role?->canManageUsers() ?? false,
            'view_logs' => $role?->canViewLogs() ?? false,
            'write_products' => $role?->canWriteProducts() ?? false,
            default => false,
        };

        if (! $allowed) {
            return response()->json(['message' => self::MESSAGES[$permission] ?? 'Akses ditolak.'], 403);
        }

        return $next($request);
    }
}
