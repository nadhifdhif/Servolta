<?php

namespace App\Enums;

enum UserRole: string
{
    case Superadmin = 'superadmin';
    case Admin = 'admin';
    case Spv = 'spv';
    case Cs = 'cs';
    case Ts = 'ts';
    case Mo = 'mo';
    case Sales = 'sales';
    case Konten = 'konten';
    case Intern = 'intern';

    public function label(): string
    {
        return match ($this) {
            self::Superadmin => 'Super Admin',
            self::Admin => 'Admin',
            self::Spv => 'Supervisor',
            self::Cs => 'Customer Service',
            self::Ts => 'Technical Support',
            self::Mo => 'Marketing Officer',
            self::Sales => 'Sales',
            self::Konten => 'Konten',
            self::Intern => 'Intern',
        };
    }

    /**
     * Role yang boleh dibuat/diubah/dihapus oleh role ini.
     *
     * @return list<self>
     */
    public function manageableRoles(): array
    {
        return match ($this) {
            self::Superadmin => self::cases(),
            self::Admin => array_values(array_filter(
                self::cases(),
                fn (self $role) => $role !== self::Superadmin,
            )),
            self::Spv => [self::Cs, self::Ts, self::Mo, self::Sales, self::Konten, self::Intern],
            default => [],
        };
    }

    public function canManage(self $target): bool
    {
        return in_array($target, $this->manageableRoles(), true);
    }

    public function canManageUsers(): bool
    {
        return $this->manageableRoles() !== [];
    }

    public function canWriteFaq(): bool
    {
        return $this !== self::Intern;
    }

    /** Upselling & cross selling. Untuk sekarang sama dengan FAQ (semua role kecuali intern). */
    public function canWriteSelling(): bool
    {
        return $this !== self::Intern;
    }

    public function canWriteProducts(): bool
    {
        return in_array($this, [self::Superadmin, self::Admin, self::Spv], true);
    }
}
