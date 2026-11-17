<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SimplifyRolesMigrationTest extends TestCase
{
    use RefreshDatabase;

    private function migration(): object
    {
        return require database_path('migrations/2026_11_16_000001_simplify_roles_and_remove_faq_category.php');
    }

    private function insertUser(string $code, string $role): void
    {
        DB::table('users')->insert([
            'name' => $code, 'login_code' => $code, 'password' => 'x',
            'role' => $role, 'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_old_job_roles_become_staff_and_the_rest_are_untouched(): void
    {
        // Di PostgreSQL batasan role baru sudah aktif; dilepas dulu untuk mensimulasikan data lama.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        }
        foreach (['admin', 'spv', 'ts', 'mo', 'cs', 'sales', 'konten', 'intern'] as $i => $role) {
            $this->insertUser("LAMA000{$i}", $role);
        }

        $this->migration()->up();

        $roles = DB::table('users')->orderBy('login_code')->pluck('role', 'login_code')->all();
        $this->assertSame('admin', $roles['LAMA0000']);
        $this->assertSame('spv', $roles['LAMA0001']);
        foreach (['LAMA0002', 'LAMA0003', 'LAMA0004', 'LAMA0005', 'LAMA0006'] as $code) {
            $this->assertSame('staff', $roles[$code], $code);
        }
        $this->assertSame('intern', $roles['LAMA0007']);
    }

    public function test_postgres_rejects_the_old_roles_after_migrating(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Batasan role di database hanya ada di PostgreSQL.');
        }

        foreach (['cs', 'ts', 'mo', 'sales', 'konten', 'superadmin'] as $old) {
            try {
                DB::transaction(fn () => $this->insertUser('TOLAK001', $old));
                $this->fail("Role {$old} seharusnya ditolak database.");
            } catch (\Illuminate\Database\QueryException) {
                $this->assertTrue(true);
            }
        }

        $this->insertUser('BOLEH001', 'staff');
        $this->assertDatabaseHas('users', ['login_code' => 'BOLEH001', 'role' => 'staff']);
    }

    public function test_faq_category_column_and_its_index_are_gone(): void
    {
        $this->assertFalse(Schema::hasColumn('faqs', 'category'));
        $this->assertFalse(Schema::hasIndex('faqs', ['product_id', 'category']));
        $this->assertTrue(Schema::hasIndex('faqs', ['product_id']));
    }

    public function test_running_the_migration_twice_is_harmless(): void
    {
        $this->insertUser('ULANG001', 'staff');

        $this->migration()->up();
        $this->migration()->up();

        $this->assertFalse(Schema::hasColumn('faqs', 'category'));
        $this->assertSame('staff', DB::table('users')->where('login_code', 'ULANG001')->value('role'));
    }
}
