<?php

namespace Tests\Unit;

use App\Enums\UserRole;
use PHPUnit\Framework\TestCase;

class UserRoleTest extends TestCase
{
    public function test_there_are_eight_roles_and_no_superadmin(): void
    {
        $this->assertCount(8, UserRole::cases());
        $this->assertNull(UserRole::tryFrom('superadmin'));
    }

    public function test_admin_manages_every_role(): void
    {
        foreach (UserRole::cases() as $role) {
            $this->assertTrue(UserRole::Admin->canManage($role));
        }
    }

    public function test_spv_manages_only_staff_below_it(): void
    {
        foreach ([UserRole::Ts, UserRole::Mo, UserRole::Cs, UserRole::Sales, UserRole::Konten, UserRole::Intern] as $role) {
            $this->assertTrue(UserRole::Spv->canManage($role));
        }
        $this->assertFalse(UserRole::Spv->canManage(UserRole::Spv));
        $this->assertFalse(UserRole::Spv->canManage(UserRole::Admin));
    }

    public function test_only_admin_and_spv_manage_users(): void
    {
        foreach (UserRole::cases() as $role) {
            $this->assertSame(in_array($role, [UserRole::Admin, UserRole::Spv], true), $role->canManageUsers());
        }
    }

    public function test_everyone_but_intern_can_write(): void
    {
        foreach (UserRole::cases() as $role) {
            $expected = $role !== UserRole::Intern;
            $this->assertSame($expected, $role->canWriteFaq(), $role->value);
            $this->assertSame($expected, $role->canWriteProducts(), $role->value);
            $this->assertSame($expected, $role->canWriteSelling(), $role->value);
        }
    }

    public function test_only_admin_can_view_login_history(): void
    {
        foreach (UserRole::cases() as $role) {
            $this->assertSame($role === UserRole::Admin, $role->canViewLogs(), $role->value);
        }
    }

    public function test_labels(): void
    {
        $this->assertSame('Sales and Data', UserRole::Sales->label());
        $this->assertSame('Content and Branding', UserRole::Konten->label());
    }
}
