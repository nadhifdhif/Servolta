<?php

namespace App\Http\Requests;

use App\Support\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Kata sandi lama diperiksa di controller (Hash::check), bukan dengan aturan `current_password`,
     * karena aturan itu memakai guard bawaan (web) sedangkan API memakai token Sanctum.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', 'different:current_password', PasswordPolicy::rule()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.required' => 'Kata sandi saat ini wajib diisi.',
            'password.required' => 'Kata sandi baru wajib diisi.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak sama.',
            'password.different' => 'Kata sandi baru harus berbeda dari yang lama.',
            'password.min' => 'Kata sandi minimal 10 karakter.',
            'password.uncompromised' => 'Kata sandi ini pernah muncul di kebocoran data. Pilih yang lain.',
        ];
    }
}
