<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function user(array $override = []): User
    {
        return User::factory()->create(array_merge([
            'login_code' => 'AKUN0001', 'password' => 'sandi-benar-123', 'role' => UserRole::Cs,
        ], $override));
    }

    private function login(string $code = 'AKUN0001', string $password = 'sandi-benar-123')
    {
        return $this->postJson('/api/login', ['code' => $code, 'password' => $password]);
    }

    public function test_account_locks_after_repeated_failures_and_unlocks_after_the_period(): void
    {
        config(['servolta.lockout_attempts' => 3, 'servolta.lockout_minutes' => 15]);
        $user = $this->user();

        for ($i = 0; $i < 3; $i++) {
            $this->login(password: 'salah')->assertStatus(422);
        }

        $this->assertTrue($user->fresh()->isLocked());

        // terkunci: kata sandi benar pun ditolak, dengan pesan yang sama seperti salah sandi
        $locked = $this->login()->assertStatus(422)->json();
        $wrong = $this->login('TIDAKADA1', 'x')->assertStatus(422)->json();
        $this->assertSame($wrong, $locked);

        $until = $user->fresh()->locked_until;
        $this->login(password: 'salah')->assertStatus(422);
        $this->assertTrue($until->equalTo($user->fresh()->locked_until), 'percobaan saat terkunci tidak memperpanjang kunci');

        $this->travel(16)->minutes();

        $this->login()->assertOk();
        $fresh = $user->fresh();
        $this->assertFalse($fresh->isLocked());
        $this->assertSame(0, $fresh->failed_logins);
    }

    public function test_a_successful_login_resets_the_failure_counter(): void
    {
        config(['servolta.lockout_attempts' => 3]);
        $user = $this->user();

        $this->login(password: 'salah')->assertStatus(422);
        $this->login(password: 'salah')->assertStatus(422);
        $this->assertSame(2, $user->fresh()->failed_logins);

        $this->login()->assertOk();
        $this->assertSame(0, $user->fresh()->failed_logins);
    }

    public function test_every_attempt_is_logged_with_a_reason(): void
    {
        $user = $this->user();
        $inactive = $this->user(['login_code' => 'MATI0001', 'is_active' => false]);

        $this->login('tidakada1', 'x');
        $this->login(password: 'salah');
        $this->login('MATI0001', 'sandi-benar-123');
        $this->login();

        $rows = LoginAttempt::query()->orderBy('id')->get();
        $this->assertSame(['unknown_code', 'wrong_password', 'inactive', null], $rows->pluck('reason')->all());
        $this->assertSame([false, false, false, true], $rows->pluck('success')->all());
        $this->assertNull($rows[0]->user_id);
        $this->assertSame($user->id, $rows[1]->user_id);
        $this->assertSame($inactive->id, $rows[2]->user_id);
        $this->assertSame('TIDAKADA1', $rows[0]->login_code);
        $this->assertNotNull($rows[3]->ip);
    }

    public function test_only_admin_can_read_the_login_history(): void
    {
        $this->login('TIDAKADA1', 'x');
        $this->login('TIDAKADA2', 'x');
        $this->user(['login_code' => 'OK000001', 'password' => 'sandi-benar-123']);
        $this->login('OK000001');

        $this->actingAs(User::factory()->create(['role' => UserRole::Spv]), 'sanctum')
            ->getJson('/api/login-attempts')->assertForbidden();

        $this->actingAs(User::factory()->create(['role' => UserRole::Admin]), 'sanctum');
        $this->getJson('/api/login-attempts')->assertOk()->assertJsonCount(3, 'data');
        $this->getJson('/api/login-attempts?success=0')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/login-attempts?success=1')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.login_code', 'OK000001');
    }

    public function test_old_attempts_are_prunable(): void
    {
        LoginAttempt::query()->create(['login_code' => 'LAMA', 'success' => false, 'created_at' => now()->subDays(100)]);
        LoginAttempt::query()->create(['login_code' => 'BARU', 'success' => false, 'created_at' => now()->subDays(10)]);

        $this->artisan('model:prune', ['--model' => [LoginAttempt::class]])->assertSuccessful();

        $this->assertSame(['BARU'], LoginAttempt::query()->pluck('login_code')->all());
    }

    public function test_a_user_with_a_temporary_password_can_only_change_it(): void
    {
        $this->user(['must_change_password' => true]);

        $token = $this->login()->assertOk()->assertJsonPath('user.must_change_password', true)->json('token');
        $this->withToken($token);

        $this->getJson('/api/products')
            ->assertForbidden()
            ->assertJsonPath('code', 'password_change_required');
        $this->getJson('/api/overview')->assertForbidden();
        $this->getJson('/api/me')->assertOk();

        $this->putJson('/api/me/password', [
            'current_password' => 'sandi-benar-123',
            'password' => 'sandi-pilihan-sendiri',
            'password_confirmation' => 'sandi-pilihan-sendiri',
        ])->assertOk()->assertJsonPath('user.must_change_password', false);

        $this->getJson('/api/products')->assertOk();
    }

    public function test_temporary_password_users_can_still_log_out(): void
    {
        $this->user(['must_change_password' => true]);
        $token = $this->login()->json('token');

        $this->withToken($token)->postJson('/api/logout')->assertOk();
    }
}
