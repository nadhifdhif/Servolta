<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function user(array $override = []): User
    {
        return User::factory()->create(array_merge([
            'login_code' => 'STAF0001',
            'password' => 'sandi-lama-123',
            'role' => UserRole::Cs,
            'is_active' => true,
        ], $override));
    }

    private function login(string $code = 'STAF0001', string $password = 'sandi-lama-123')
    {
        return $this->postJson('/api/login', ['code' => $code, 'password' => $password]);
    }

    public function test_login_is_limited_per_code_and_ip_in_indonesian(): void
    {
        $this->user();

        for ($i = 0; $i < 5; $i++) {
            $this->login(password: 'salah')->assertStatus(422);
        }

        // percobaan ke-6 diblokir, walau kata sandinya benar
        $this->login()
            ->assertStatus(429)
            ->assertJsonPath('message', 'Terlalu banyak percobaan masuk. Coba lagi sebentar lagi.')
            ->assertHeader('Retry-After');

        // kode lain dari IP yang sama tidak ikut terkunci
        $this->login('LAIN0001', 'x')->assertStatus(422);
    }

    public function test_an_office_sharing_one_ip_is_not_locked_out_by_different_users(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $this->login("ORANG{$i}X", 'x')->assertStatus(422);
        }
    }

    public function test_unknown_code_and_wrong_password_give_the_same_answer(): void
    {
        $this->user();

        $a = $this->login('TIDAKADA1', 'apa-saja')->assertStatus(422)->json();
        $b = $this->login('STAF0001', 'salah')->assertStatus(422)->json();

        $this->assertSame($a, $b);
    }

    public function test_token_lifetime_comes_from_config(): void
    {
        $this->user();
        config(['servolta.token_days' => 2]);

        $this->login()->assertOk();

        $expires = PersonalAccessToken::query()->latest('id')->firstOrFail()->expires_at;
        $this->assertTrue($expires->between(now()->addDays(2)->subMinute(), now()->addDays(2)->addMinute()));
    }

    public function test_an_expired_token_is_rejected(): void
    {
        $plain = $this->user()->createToken('web', ['*'], now()->subMinute())->plainTextToken;

        $this->withToken($plain)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_a_deactivated_user_loses_access_and_tokens_even_if_deactivated_outside_the_app(): void
    {
        $user = $this->user();
        $plain = $user->createToken('web')->plainTextToken;

        $this->withToken($plain)->getJson('/api/me')->assertOk();

        $user->forceFill(['is_active' => false])->save();
        $this->app['auth']->forgetGuards();

        $this->withToken($plain)->getJson('/api/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Akun ini dinonaktifkan. Hubungi admin.');
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_logout_all_revokes_every_device_of_that_user_only(): void
    {
        $user = $this->user();
        $other = $this->user(['login_code' => 'LAIN0001']);
        $mine = $user->createToken('laptop')->plainTextToken;
        $user->createToken('hp');
        $other->createToken('laptop');

        $this->withToken($mine)->postJson('/api/logout-all')->assertOk();

        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(1, $other->tokens()->count());
    }

    public function test_profile_update_changes_only_the_name(): void
    {
        $user = $this->user();
        $plain = $user->createToken('web')->plainTextToken;

        $this->withToken($plain)->putJson('/api/me', [
            'name' => 'Nama Baru', 'role' => 'admin', 'login_code' => 'BARU0001', 'employee_id' => 99, 'is_active' => false,
        ])->assertOk()->assertJsonPath('data.name', 'Nama Baru')->assertJsonPath('data.role', 'cs');

        $fresh = $user->fresh();
        $this->assertSame('STAF0001', $fresh->login_code);
        $this->assertNull($fresh->employee_id);
        $this->assertSame(UserRole::Cs, $fresh->role);
        $this->assertTrue($fresh->is_active);

        $this->putJson('/api/me', ['name' => ''])->assertStatus(422)->assertJsonValidationErrors('name');
    }

    public function test_change_password_validation(): void
    {
        $plain = $this->user()->createToken('web')->plainTextToken;
        $this->withToken($plain);
        $ok = ['current_password' => 'sandi-lama-123', 'password' => 'sandi-baru-456', 'password_confirmation' => 'sandi-baru-456'];

        $this->putJson('/api/me/password', array_merge($ok, ['current_password' => 'salah']))
            ->assertStatus(422)->assertJsonValidationErrors('current_password');
        $this->putJson('/api/me/password', array_merge($ok, ['password_confirmation' => 'beda']))
            ->assertStatus(422)->assertJsonValidationErrors('password');
        $this->putJson('/api/me/password', array_merge($ok, ['password' => 'sandi-lama-123', 'password_confirmation' => 'sandi-lama-123']))
            ->assertStatus(422)->assertJsonValidationErrors('password');
        $this->putJson('/api/me/password', array_merge($ok, ['password' => 'pendek123', 'password_confirmation' => 'pendek123']))
            ->assertStatus(422)->assertJsonValidationErrors('password'); // 9 karakter: kurang dari 10
    }

    public function test_change_password_keeps_this_session_and_revokes_the_others(): void
    {
        $user = $this->user();
        $user->createToken('perangkat-lain');
        $current = $this->login()->json('token');

        $this->withToken($current)->putJson('/api/me/password', [
            'current_password' => 'sandi-lama-123',
            'password' => 'sandi-baru-456',
            'password_confirmation' => 'sandi-baru-456',
        ])->assertOk();

        $this->assertSame(1, $user->tokens()->count(), 'hanya sesi yang sedang dipakai yang tersisa');
        $this->withToken($current)->getJson('/api/me')->assertOk();

        $this->login(password: 'sandi-lama-123')->assertStatus(422);
        $this->login(password: 'sandi-baru-456')->assertOk();
    }

    public function test_cors_allows_only_configured_origins(): void
    {
        $this->withHeaders(['Origin' => 'http://localhost:5173'])->getJson('/api/me')
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');

        $this->withHeaders(['Origin' => 'https://situs-asing.example'])->getJson('/api/me')
            ->assertHeaderMissing('Access-Control-Allow-Origin');
    }
}
