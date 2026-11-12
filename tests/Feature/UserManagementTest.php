<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function make(UserRole $role, array $extra = []): User
    {
        return User::factory()->create(array_merge(['role' => $role, 'is_active' => true], $extra));
    }

    private function actAs(UserRole $role): User
    {
        $user = $this->make($role);
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'name' => 'Orang Baru',
            'login_code' => 'BARU0001',
            'role' => 'cs',
            'password' => 'sandi-sementara-1',
        ], $override);
    }

    public function test_guest_and_staff_cannot_manage_users(): void
    {
        $this->getJson('/api/users')->assertUnauthorized();

        foreach ([UserRole::Ts, UserRole::Mo, UserRole::Cs, UserRole::Sales, UserRole::Konten, UserRole::Intern] as $role) {
            $this->actAs($role);
            $this->getJson('/api/users')->assertForbidden()->assertJsonPath('message', 'Role Anda tidak boleh mengelola pengguna.');
            $this->postJson('/api/users', $this->payload())->assertForbidden();
        }
        $this->assertSame(0, User::query()->where('login_code', 'BARU0001')->count());
    }

    public function test_admin_sees_everyone_and_spv_sees_only_staff_below(): void
    {
        $admin = $this->make(UserRole::Admin);
        $spv = $this->make(UserRole::Spv);
        $cs = $this->make(UserRole::Cs);
        $intern = $this->make(UserRole::Intern);

        $this->actingAs($admin, 'sanctum')->getJson('/api/users')->assertOk()->assertJsonCount(4, 'data');

        $ids = $this->actingAs($spv, 'sanctum')->getJson('/api/users')->assertOk()->json('data.*.id');
        $this->assertEqualsCanonicalizing([$cs->id, $intern->id], $ids);
    }

    public function test_listing_never_exposes_passwords_or_email(): void
    {
        $this->actAs(UserRole::Admin);

        $row = $this->getJson('/api/users')->assertOk()->json('data.0');
        $this->assertArrayNotHasKey('password', $row);
        $this->assertArrayNotHasKey('email', $row);
        $this->assertArrayHasKey('login_code', $row);
    }

    public function test_admin_creates_any_role_including_another_admin(): void
    {
        $this->actAs(UserRole::Admin);

        foreach (['admin', 'spv', 'ts', 'mo', 'cs', 'sales', 'konten', 'intern'] as $i => $role) {
            $this->postJson('/api/users', $this->payload(['role' => $role, 'login_code' => "KODE000{$i}"]))
                ->assertCreated()
                ->assertJsonPath('data.role', $role);
        }
    }

    public function test_spv_cannot_create_spv_or_admin(): void
    {
        $this->actAs(UserRole::Spv);

        foreach (['admin', 'spv'] as $role) {
            $this->postJson('/api/users', $this->payload(['role' => $role]))
                ->assertStatus(422)
                ->assertJsonValidationErrors('role');
        }
        $this->postJson('/api/users', $this->payload(['role' => 'konten']))->assertCreated();
    }

    public function test_new_accounts_must_change_the_temporary_password(): void
    {
        $this->actAs(UserRole::Spv);

        $this->postJson('/api/users', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.must_change_password', true);

        $this->assertTrue(User::query()->where('login_code', 'BARU0001')->firstOrFail()->must_change_password);
    }

    public function test_a_random_code_is_generated_when_none_is_given(): void
    {
        $this->actAs(UserRole::Admin);

        $code = $this->postJson('/api/users', $this->payload(['login_code' => null]))
            ->assertCreated()
            ->json('data.login_code');

        $this->assertMatchesRegularExpression('/^[A-HJKMNP-Z2-9]{8}$/', $code);
    }

    public function test_code_is_normalized_and_validated(): void
    {
        $this->actAs(UserRole::Admin);

        $this->postJson('/api/users', $this->payload(['login_code' => '  baru0001 ']))
            ->assertCreated()
            ->assertJsonPath('data.login_code', 'BARU0001');

        $this->postJson('/api/users', $this->payload(['login_code' => 'BARU0001']))->assertStatus(422)->assertJsonValidationErrors('login_code');
        $this->postJson('/api/users', $this->payload(['login_code' => 'AB1']))->assertStatus(422)->assertJsonValidationErrors('login_code');
        $this->postJson('/api/users', $this->payload(['login_code' => 'ada spasi']))->assertStatus(422)->assertJsonValidationErrors('login_code');
        $this->postJson('/api/users', $this->payload(['login_code' => 'ADA-STRIP']))->assertStatus(422)->assertJsonValidationErrors('login_code');
    }

    public function test_employee_id_is_an_optional_unique_integer(): void
    {
        $this->actAs(UserRole::Admin);

        $this->postJson('/api/users', $this->payload(['employee_id' => 10234]))
            ->assertCreated()
            ->assertJsonPath('data.employee_id', 10234);

        $this->postJson('/api/users', $this->payload(['login_code' => 'KODE0002', 'employee_id' => 10234]))
            ->assertStatus(422)->assertJsonValidationErrors('employee_id');
        $this->postJson('/api/users', $this->payload(['login_code' => 'KODE0003', 'employee_id' => 'abc']))
            ->assertStatus(422)->assertJsonValidationErrors('employee_id');
        $this->postJson('/api/users', $this->payload(['login_code' => 'KODE0004', 'employee_id' => '']))
            ->assertCreated()->assertJsonPath('data.employee_id', null);
    }

    public function test_password_must_be_at_least_ten_characters(): void
    {
        $this->actAs(UserRole::Admin);

        $this->postJson('/api/users', $this->payload(['password' => 'pendek123']))->assertStatus(422)->assertJsonValidationErrors('password');
        $this->postJson('/api/users', $this->payload(['password' => null]))->assertStatus(422)->assertJsonValidationErrors('password');
        $this->postJson('/api/users', $this->payload(['password' => '1234567890']))->assertCreated();
    }

    public function test_new_user_can_log_in_with_lowercase_code_and_password_is_hashed(): void
    {
        $this->actAs(UserRole::Spv);
        $this->postJson('/api/users', $this->payload())->assertCreated();

        $this->assertNotSame('sandi-sementara-1', User::query()->where('login_code', 'BARU0001')->value('password'));

        $this->postJson('/api/login', ['code' => 'baru0001', 'password' => 'sandi-sementara-1'])
            ->assertOk()
            ->assertJsonPath('user.role', 'cs');
    }

    public function test_update_within_limits(): void
    {
        $this->actAs(UserRole::Spv);
        $cs = $this->make(UserRole::Cs, ['login_code' => 'STAF0001']);
        $base = ['name' => 'Nama Baru', 'login_code' => 'STAF0001', 'role' => 'ts', 'password' => null];

        $this->putJson("/api/users/{$cs->id}", $base)
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru')
            ->assertJsonPath('data.role', 'ts');

        // spv tidak boleh menaikkan staf menjadi spv
        $this->putJson("/api/users/{$cs->id}", array_merge($base, ['role' => 'spv']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('role');
    }

    public function test_spv_cannot_touch_spv_or_admin_accounts(): void
    {
        $this->actAs(UserRole::Spv);
        $other = $this->make(UserRole::Spv, ['login_code' => 'SPVLAIN1']);
        $admin = $this->make(UserRole::Admin, ['login_code' => 'ADMIN001']);

        foreach ([$other, $admin] as $target) {
            $this->putJson("/api/users/{$target->id}", $this->payload(['login_code' => $target->login_code]))->assertForbidden();
            $this->postJson("/api/users/{$target->id}/unlock")->assertForbidden();
            $this->deleteJson("/api/users/{$target->id}")->assertForbidden();
        }
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'role' => 'admin']);
    }

    public function test_nobody_edits_or_deletes_their_own_account_here(): void
    {
        $me = $this->actAs(UserRole::Admin);

        $this->putJson("/api/users/{$me->id}", $this->payload(['login_code' => $me->login_code, 'role' => 'intern']))->assertForbidden();
        $this->deleteJson("/api/users/{$me->id}")->assertForbidden();
        $this->assertSame(UserRole::Admin, $me->fresh()->role);
    }

    public function test_security_relevant_changes_revoke_tokens_and_a_password_reset_forces_a_new_one(): void
    {
        $this->actAs(UserRole::Admin);
        $target = $this->make(UserRole::Cs, ['login_code' => 'STAF0002']);
        $base = ['name' => $target->name, 'login_code' => 'STAF0002', 'role' => 'cs', 'password' => null];

        $target->createToken('web');
        $this->putJson("/api/users/{$target->id}", $base + ['is_active' => true])->assertOk();
        $this->assertSame(1, $target->tokens()->count(), 'perubahan tanpa efek keamanan tidak boleh mencabut sesi');
        $this->assertFalse($target->fresh()->must_change_password);

        $this->putJson("/api/users/{$target->id}", ['password' => 'sandi-reset-12345'] + $base)->assertOk();
        $this->assertSame(0, $target->tokens()->count());
        $this->assertTrue($target->fresh()->must_change_password, 'reset oleh admin: wajib diganti saat masuk berikutnya');

        $target->createToken('web');
        $this->putJson("/api/users/{$target->id}", ['role' => 'ts'] + $base)->assertOk();
        $this->assertSame(0, $target->tokens()->count());

        $target->createToken('web');
        $this->putJson("/api/users/{$target->id}", ['login_code' => 'STAF0099', 'role' => 'ts'] + $base)->assertOk();
        $this->assertSame(0, $target->tokens()->count(), 'ganti kode mencabut sesi lama');

        $target->createToken('web');
        $this->putJson("/api/users/{$target->id}", ['login_code' => 'STAF0099', 'role' => 'ts', 'is_active' => false] + $base)->assertOk();
        $this->assertSame(0, $target->tokens()->count());
        $this->assertFalse($target->fresh()->is_active);
    }

    public function test_unlock_clears_a_lockout(): void
    {
        $this->actAs(UserRole::Spv);
        $locked = $this->make(UserRole::Cs, ['failed_logins' => 4, 'locked_until' => now()->addMinutes(10)]);

        $this->getJson('/api/users')->assertOk()->assertJsonPath('data.0.is_locked', true);

        $this->postJson("/api/users/{$locked->id}/unlock")
            ->assertOk()
            ->assertJsonPath('data.is_locked', false);

        $fresh = $locked->fresh();
        $this->assertNull($fresh->locked_until);
        $this->assertSame(0, $fresh->failed_logins);
    }

    public function test_delete_user_removes_tokens(): void
    {
        $this->actAs(UserRole::Spv);
        $target = $this->make(UserRole::Intern);
        $target->createToken('web');

        $this->deleteJson("/api/users/{$target->id}")->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->deleteJson("/api/users/{$target->id}")->assertNotFound();
    }

    public function test_code_must_stay_unique_on_update(): void
    {
        $this->actAs(UserRole::Admin);
        $a = $this->make(UserRole::Cs, ['login_code' => 'KODEAAAA']);
        $this->make(UserRole::Cs, ['login_code' => 'KODEBBBB']);

        $this->putJson("/api/users/{$a->id}", $this->payload(['login_code' => 'KODEBBBB', 'password' => null]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('login_code');
    }

    public function test_me_exposes_permissions_for_the_role_matrix(): void
    {
        $expect = [
            'admin' => [true, true, true], 'spv' => [true, true, false], 'ts' => [false, true, false], 'mo' => [false, true, false],
            'cs' => [false, true, false], 'sales' => [false, true, false], 'konten' => [false, true, false], 'intern' => [false, false, false],
        ];
        foreach ($expect as $role => [$manage, $write, $logs]) {
            $this->actAs(UserRole::from($role));
            $this->getJson('/api/me')
                ->assertJsonPath('data.permissions.manage_users', $manage)
                ->assertJsonPath('data.permissions.write_products', $write)
                ->assertJsonPath('data.permissions.write_faq', $write)
                ->assertJsonPath('data.permissions.write_selling', $write)
                ->assertJsonPath('data.permissions.view_logs', $logs);
        }
    }

    public function test_migration_converts_old_superadmin_accounts_to_admin(): void
    {
        // Di PostgreSQL batasan role baru sudah aktif, jadi dilonggarkan dulu untuk mensimulasikan data lama.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        }
        DB::table('users')->insert([
            'name' => 'Pemilik Lama', 'login_code' => 'LAMA0001', 'password' => 'x',
            'role' => 'superadmin', 'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        (require database_path('migrations/2026_11_04_000001_remove_superadmin_role.php'))->up();

        $this->assertSame('admin', DB::table('users')->where('login_code', 'LAMA0001')->value('role'));
    }
}
