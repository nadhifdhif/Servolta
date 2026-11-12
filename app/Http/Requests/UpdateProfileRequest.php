<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Pengguna hanya boleh mengubah namanya sendiri. Email dan role diatur admin/supervisor. */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:100']];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['name.required' => 'Nama wajib diisi.'];
    }
}
