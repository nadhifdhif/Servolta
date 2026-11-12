<?php

namespace App\Http\Requests;

use App\Support\LoginCode;
use App\Support\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    // Izin (manage_users) dicek middleware; batas per-role dicek di sini dan di controller.
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $code = $this->input('login_code');
        $this->merge([
            'login_code' => is_string($code) && trim($code) !== '' ? LoginCode::normalize($code) : null,
            'employee_id' => $this->input('employee_id') === '' ? null : $this->input('employee_id'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $target = $this->route('user');
        $assignable = array_map(fn ($role) => $role->value, $this->user()->role->manageableRoles());

        return [
            'name' => ['required', 'string', 'max:100'],
            // Saat menambah, kode boleh kosong (dibuat acak oleh server).
            'login_code' => [
                $target ? 'required' : 'nullable', 'string', 'regex:'.LoginCode::PATTERN,
                Rule::unique('users', 'login_code')->ignore($target?->id),
            ],
            'employee_id' => [
                'nullable', 'integer', 'min:1', 'max:2147483647',
                Rule::unique('users', 'employee_id')->ignore($target?->id),
            ],
            'role' => ['required', Rule::in($assignable)],
            'password' => [$target ? 'nullable' : 'required', PasswordPolicy::rule()],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama wajib diisi.',
            'login_code.required' => 'Kode login wajib diisi.',
            'login_code.regex' => 'Kode hanya boleh huruf besar dan angka, 4 sampai 20 karakter.',
            'login_code.unique' => 'Kode ini sudah dipakai akun lain.',
            'employee_id.integer' => 'ID karyawan harus berupa angka.',
            'employee_id.unique' => 'ID karyawan ini sudah terdaftar pada akun lain.',
            'role.required' => 'Role wajib dipilih.',
            'role.in' => 'Anda tidak boleh memberikan role ini.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 10 karakter.',
            'password.uncompromised' => 'Kata sandi ini pernah muncul di kebocoran data. Pilih yang lain.',
        ];
    }
}
