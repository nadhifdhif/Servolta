<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\LoginAttempt;
use App\Models\User;
use App\Support\LoginCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /** Hash palsu agar waktu respons sama untuk kode yang tidak terdaftar (mencegah penebakan akun). */
    private const DUMMY_HASH = '$2y$12$tKc1vbYEOetymlsCYAswx.U.ucpLkT0gOc3YqaN8p.NpEuvTa61ue';

    /** Satu pesan untuk semua kegagalan, supaya orang luar tidak tahu kode mana yang valid atau terkunci. */
    private const FAIL_MESSAGE = 'Kode atau kata sandi salah, atau akun sedang terkunci sementara.';

    public function login(LoginRequest $request): JsonResponse
    {
        $code = LoginCode::normalize($request->validated('code'));
        $user = User::query()->where('login_code', $code)->first();
        $locked = $user?->isLocked() ?? false;

        $passwordOk = Hash::check($request->validated('password'), $user?->password ?? self::DUMMY_HASH);

        if (! $user || $locked || ! $passwordOk) {
            $this->recordFailure($request, $user, $code, ! $user ? 'unknown_code' : ($locked ? 'locked' : 'wrong_password'));

            throw ValidationException::withMessages(['code' => [self::FAIL_MESSAGE]]);
        }

        if (! $user->is_active) {
            $this->log($request, $user, $code, false, 'inactive');

            throw ValidationException::withMessages(['code' => ['Akun ini dinonaktifkan. Hubungi admin.']]);
        }

        $user->forceFill(['failed_logins' => 0, 'locked_until' => null])->save();
        $this->log($request, $user, $code, true, null);

        $token = $user->createToken('web', ['*'], now()->addDays(config('servolta.token_days')))->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    /** Keluar dari semua perangkat (mis. laptop hilang atau lupa logout di komputer bersama). */
    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Berhasil keluar dari semua perangkat.']);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function updateProfile(UpdateProfileRequest $request): UserResource
    {
        $request->user()->update($request->validated());

        return new UserResource($request->user());
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->validated('current_password'), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Kata sandi saat ini salah.'],
            ]);
        }

        $user->password = $request->validated('password');
        $user->must_change_password = false;
        $user->save();

        // Sesi di perangkat lain dicabut; sesi yang sedang dipakai tetap hidup.
        $current = $user->currentAccessToken();
        $keep = $current instanceof PersonalAccessToken ? $current->id : null;
        $user->tokens()->when($keep, fn ($query) => $query->where('id', '!=', $keep))->delete();

        return response()->json(['message' => 'Kata sandi diubah.', 'user' => new UserResource($user)]);
    }

    /** Menambah hitungan gagal; setelah batasnya, akun dikunci sementara (tidak diperpanjang saat sudah terkunci). */
    private function recordFailure(Request $request, ?User $user, string $code, string $reason): void
    {
        if ($user && $reason === 'wrong_password') {
            $user->failed_logins++;

            if ($user->failed_logins >= config('servolta.lockout_attempts')) {
                $user->failed_logins = 0;
                $user->locked_until = now()->addMinutes(config('servolta.lockout_minutes'));
            }
            $user->save();
        }

        $this->log($request, $user, $code, false, $reason);
    }

    private function log(Request $request, ?User $user, string $code, bool $success, ?string $reason): void
    {
        LoginAttempt::query()->create([
            'login_code' => mb_substr($code, 0, 40),
            'user_id' => $user?->id,
            'ip' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 255),
            'success' => $success,
            'reason' => $reason,
        ]);
    }
}
