<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

class LoginAttempt extends Model
{
    use Prunable;

    public $timestamps = false;

    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['success' => 'boolean', 'created_at' => 'datetime'];
    }

    /** Dibersihkan otomatis lewat `php artisan model:prune` (lihat docs/AUTH.md). */
    public function prunable(): Builder
    {
        return static::query()->where('created_at', '<', now()->subDays(90));
    }
}
