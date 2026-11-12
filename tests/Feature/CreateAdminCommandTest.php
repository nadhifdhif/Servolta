<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_an_admin_with_the_given_code(): void
    {
        $this->artisan('servolta:create-admin', ['code' => ' pemilik1 ', '--name' => 'Pemilik', '--employee-id' => '4521', '--password' => 'sandi-panjang-1'])
            ->assertSuccessful();

        $user = User::query()->where('login_code', 'PEMILIK1')->firstOrFail();
        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertTrue($user->is_active);
        $this->assertFalse($user->must_change_password);
        $this->assertSame('Pemilik', $user->name);
        $this->assertSame(4521, $user->employee_id);
        $this->assertTrue(Hash::check('sandi-panjang-1', $user->password));
    }

    public function test_generates_a_random_code_when_none_is_given(): void
    {
        $this->artisan('servolta:create-admin', ['--password' => 'sandi-panjang-1'])
            ->expectsOutputToContain('Kode masuk: ')
            ->assertSuccessful();

        $user = User::query()->firstOrFail();
        $this->assertMatchesRegularExpression('/^[A-HJKMNP-Z2-9]{8}$/', $user->login_code);
        $this->assertSame(UserRole::Admin, $user->role);
    }

    public function test_existing_account_is_promoted_reactivated_and_unlocked(): void
    {
        User::factory()->create([
            'login_code' => 'STAF0001', 'name' => 'Staf', 'role' => UserRole::Intern,
            'is_active' => false, 'failed_logins' => 3, 'locked_until' => now()->addHour(),
        ]);

        $this->artisan('servolta:create-admin', ['code' => 'STAF0001', '--password' => 'sandi-baru-12345'])->assertSuccessful();

        $user = User::query()->where('login_code', 'STAF0001')->firstOrFail();
        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertTrue($user->is_active);
        $this->assertFalse($user->isLocked());
        $this->assertSame('Staf', $user->name, 'nama lama dipertahankan bila --name tidak diberikan');
        $this->assertSame(1, User::query()->count());
    }

    public function test_rejects_a_short_password_a_bad_code_or_a_bad_employee_id(): void
    {
        $this->artisan('servolta:create-admin', ['code' => 'ADMIN001', '--password' => 'pendek123'])->assertFailed();
        $this->artisan('servolta:create-admin', ['code' => 'bukan kode!', '--password' => 'sandi-panjang-1'])->assertFailed();
        $this->artisan('servolta:create-admin', ['code' => 'ADMIN001', '--employee-id' => 'abc', '--password' => 'sandi-panjang-1'])->assertFailed();

        $this->assertSame(0, User::query()->count());
    }
}
