<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\LoginCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class UserController extends Controller
{
    /** Yang terlihat hanya akun dengan role yang boleh dikelola peminta. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $roles = array_map(fn (UserRole $role) => $role->value, $request->user()->role->manageableRoles());

        return UserResource::collection(
            User::query()->whereIn('role', $roles)->orderBy('name')->orderBy('id')->get()
        );
    }

    public function store(UserRequest $request): JsonResponse
    {
        $user = new User($request->safe()->only(['name', 'login_code', 'employee_id', 'password']));
        $user->login_code ??= $this->uniqueCode();
        $user->forceFill([
            'role' => UserRole::from($request->validated('role')),
            'is_active' => $request->boolean('is_active', true),
            'must_change_password' => true, // sandi dari admin hanya sementara
        ])->save();

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function update(UserRequest $request, User $user): UserResource
    {
        $this->authorizeTarget($request, $user);

        $user->fill($request->safe()->only(['name', 'login_code', 'employee_id']));
        if ($request->filled('password')) {
            $user->password = $request->validated('password');
            $user->must_change_password = true; // reset oleh admin: wajib diganti saat masuk berikutnya
        }
        $user->forceFill([
            'role' => UserRole::from($request->validated('role')),
            'is_active' => $request->boolean('is_active', $user->is_active),
        ]);

        // Sesi lama dicabut bila akun dinonaktifkan, sandi diganti, atau role berubah.
        $revoke = $user->isDirty(['password', 'role', 'login_code']) || ($user->isDirty('is_active') && ! $user->is_active);
        $user->save();
        if ($revoke) {
            $user->tokens()->delete();
        }

        return new UserResource($user);
    }

    /** Membuka kunci akun yang terkunci karena salah sandi berulang. */
    public function unlock(Request $request, User $user): UserResource
    {
        $this->authorizeTarget($request, $user);

        $user->forceFill(['failed_logins' => 0, 'locked_until' => null])->save();

        return new UserResource($user);
    }

    public function destroy(Request $request, User $user): Response
    {
        $this->authorizeTarget($request, $user);

        $user->tokens()->delete();
        $user->delete();

        return response()->noContent();
    }

    private function uniqueCode(): string
    {
        do {
            $code = LoginCode::generate();
        } while (User::query()->where('login_code', $code)->exists());

        return $code;
    }

    /** Akun sendiri tidak diubah lewat sini, dan hanya role yang boleh dikelola yang dapat disentuh. */
    private function authorizeTarget(Request $request, User $target): void
    {
        abort_if($request->user()->is($target), 403, 'Akun Anda sendiri tidak bisa diubah dari menu pengguna.');
        abort_unless($request->user()->role->canManage($target->role), 403, 'Role Anda tidak boleh mengelola akun ini.');
    }
}
