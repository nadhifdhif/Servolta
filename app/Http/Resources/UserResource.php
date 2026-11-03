<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'role_label' => $this->role->label(),
            'is_active' => $this->is_active,
            // Dipakai FE untuk menampilkan/menyembunyikan tombol. Server tetap yang memutuskan.
            'permissions' => [
                'manage_users' => $this->role->canManageUsers(),
                'write_faq' => $this->role->canWriteFaq(),
                'write_selling' => $this->role->canWriteSelling(),
                'write_products' => $this->role->canWriteProducts(),
            ],
        ];
    }
}
