<?php

namespace App\Http\Controllers;

use App\Models\LoginAttempt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoginAttemptController extends Controller
{
    /** Riwayat percobaan masuk terbaru (maks. 200), untuk Admin: mendeteksi tebak sandi. */
    public function index(Request $request): JsonResponse
    {
        $query = LoginAttempt::query()->latest('id')->limit(200);

        if ($request->query('success') !== null) {
            $query->where('success', filter_var($request->query('success'), FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json(['data' => $query->get()->map(fn (LoginAttempt $a) => [
            'id' => $a->id,
            'login_code' => $a->login_code,
            'user_id' => $a->user_id,
            'ip' => $a->ip,
            'success' => $a->success,
            'reason' => $a->reason,
            'created_at' => $a->created_at?->toIso8601String(),
        ])->all()]);
    }
}
