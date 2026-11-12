<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(UserRole $role = UserRole::Cs, bool $active = true): User
    {
        return User::factory()->create([
            'login_code' => 'TESTER01',
            'password' => 'password',
            'role' => $role,
            'is_active' => $active,
        ]);
    }

    public function test_login_returns_token_and_user_without_email(): void
    {
        $this->makeUser(UserRole::Spv);

        $response = $this->postJson('/api/login', ['code' => 'TESTER01', 'password' => 'password'])
            ->assertOk()
            ->assertJsonStructure(['token', 'token_type', 'user' => ['id', 'name', 'login_code', 'employee_id', 'role', 'must_change_password', 'permissions']])
            ->assertJsonPath('user.role', 'spv')
            ->assertJsonPath('user.login_code', 'TESTER01')
            ->assertJsonPath('user.permissions.manage_users', true);

        $this->assertArrayNotHasKey('email', $response->json('user'));
    }

    public function test_code_is_case_insensitive_and_trimmed(): void
    {
        $this->makeUser();

        $this->postJson('/api/login', ['code' => '  tester01 ', 'password' => 'password'])->assertOk();
    }

    public function test_login_fails_with_wrong_password_and_reports_on_the_code_field(): void
    {
        $this->makeUser();

        $this->postJson('/api/login', ['code' => 'TESTER01', 'password' => 'salah'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');
    }

    public function test_inactive_user_cannot_login(): void
    {
        $this->makeUser(active: false);

        $this->postJson('/api/login', ['code' => 'TESTER01', 'password' => 'password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');
    }

    public function test_login_requires_both_fields(): void
    {
        $this->postJson('/api/login', [])->assertStatus(422)->assertJsonValidationErrors(['code', 'password']);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_me_returns_current_user(): void
    {
        $this->makeUser(UserRole::Intern);

        $token = $this->postJson('/api/login', ['code' => 'TESTER01', 'password' => 'password'])->json('token');

        $this->withToken($token)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.role', 'intern')
            ->assertJsonPath('data.permissions.write_faq', false);
    }

    public function test_logout_revokes_the_token(): void
    {
        $this->makeUser();

        $token = $this->postJson('/api/login', ['code' => 'TESTER01', 'password' => 'password'])->json('token');

        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->withToken($token)->postJson('/api/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
