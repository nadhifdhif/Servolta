<?php

namespace Tests\Unit;

use App\Enums\UserRole;
use PHPUnit\Framework\TestCase;

class UserRoleTest extends TestCase
{
    public function test_there_are_four_roles(): void
    {
        $this->assertSame(['admin', 'spv', 'staff', 'intern'], array_map(fn (UserRole $r) => $r->value, UserRole::cases()));

        foreach (['superadmin', 'ts', 'mo', 'cs', 'sales', 'konten'] as $old) {
            $this->assertNull(UserRole::tryFrom($old), $old);
        }
    }

    public function test_admin_manages_every_role(): void
    {
        foreach (UserRole::cases() as $role) {
            $this->assertTrue(UserRole::Admin->canManage($role));
        }
    }

    public function test_spv_manages_only_staff_and_intern(): void
    {
        $this->assertTrue(UserRole::Spv->canManage(UserRole::Staff));
        $this->assertTrue(UserRole::Spv->canManage(UserRole::Intern));
        $this->assertFalse(UserRole::Spv->canManage(UserRole::Spv));
        $this->assertFalse(UserRole::Spv->canManage(UserRole::Admin));
    }

    public function test_staff_and_intern_manage_nobody(): void
    {
        foreach ([UserRole::Staff, UserRole::Intern] as $role) {
            $this->assertSame([], $role->manageableRoles(), $role->value);
        }
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
        $this->assertSame('Admin', UserRole::Admin->label());
        $this->assertSame('Supervisor', UserRole::Spv->label());
        $this->assertSame('Staff', UserRole::Staff->label());
        $this->assertSame('Intern', UserRole::Intern->label());
    }
}
