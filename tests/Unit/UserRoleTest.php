<?php

namespace Tests\Unit;

use App\Enums\UserRole;
use PHPUnit\Framework\TestCase;

class UserRoleTest extends TestCase
{
    public function test_superadmin_can_manage_every_role(): void
    {
        foreach (UserRole::cases() as $role) {
            $this->assertTrue(UserRole::Superadmin->canManage($role));
        }
    }

    public function test_admin_cannot_manage_superadmin(): void
    {
        $this->assertFalse(UserRole::Admin->canManage(UserRole::Superadmin));
        $this->assertTrue(UserRole::Admin->canManage(UserRole::Spv));
    }

    public function test_spv_manages_only_staff_below_it(): void
    {
        $this->assertTrue(UserRole::Spv->canManage(UserRole::Cs));
        $this->assertTrue(UserRole::Spv->canManage(UserRole::Intern));
        $this->assertFalse(UserRole::Spv->canManage(UserRole::Spv));
        $this->assertFalse(UserRole::Spv->canManage(UserRole::Admin));
        $this->assertFalse(UserRole::Spv->canManage(UserRole::Superadmin));
    }

    public function test_staff_roles_cannot_manage_users(): void
    {
        foreach ([UserRole::Cs, UserRole::Ts, UserRole::Mo, UserRole::Sales, UserRole::Konten, UserRole::Intern] as $role) {
            $this->assertFalse($role->canManageUsers());
        }
    }

    public function test_faq_and_product_write_permissions(): void
    {
        $this->assertTrue(UserRole::Cs->canWriteFaq());
        $this->assertTrue(UserRole::Konten->canWriteFaq());
        $this->assertFalse(UserRole::Intern->canWriteFaq());

        $this->assertTrue(UserRole::Spv->canWriteProducts());
        $this->assertFalse(UserRole::Cs->canWriteProducts());
        $this->assertFalse(UserRole::Intern->canWriteProducts());
    }
}
