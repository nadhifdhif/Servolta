<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Spv = 'spv';
    case Ts = 'ts';
    case Mo = 'mo';
    case Cs = 'cs';
    case Sales = 'sales';
    case Konten = 'konten';
    case Intern = 'intern';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin',
            self::Spv => 'Supervisor',
            self::Ts => 'Technical Support',
            self::Mo => 'Marketing Officer',
            self::Cs => 'Customer Service',
            self::Sales => 'Sales and Data',
            self::Konten => 'Content and Branding',
            self::Intern => 'Intern',
        };
    }

    /**
     * Role yang boleh dibuat/diubah/dihapus oleh role ini.
     * Admin mengelola semua role; Supervisor hanya staf di bawahnya.
     *
     * @return list<self>
     */
    public function manageableRoles(): array
    {
        return match ($this) {
            self::Admin => self::cases(),
            self::Spv => [self::Ts, self::Mo, self::Cs, self::Sales, self::Konten, self::Intern],
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

    /** Riwayat percobaan masuk: hanya Admin. */
    public function canViewLogs(): bool
    {
        return $this === self::Admin;
    }

    /** Semua role selain Intern boleh menulis. Intern hanya melihat. */
    public function canWrite(): bool
    {
        return $this !== self::Intern;
    }

    public function canWriteFaq(): bool
    {
        return $this->canWrite();
    }

    /** Upselling & cross selling. */
    public function canWriteSelling(): bool
    {
        return $this->canWrite();
    }

    /** SKU (produk + spesifikasi), wiring, dan datasheet. */
    public function canWriteProducts(): bool
    {
        return $this->canWrite();
    }
}
