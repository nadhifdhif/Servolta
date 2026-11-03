<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SpecsRequest extends FormRequest
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
        return [
            'specs' => ['present', 'array', 'max:40'],
            'specs.*.label' => ['required', 'string', 'max:80'],
            'specs.*.value' => ['required', 'string', 'max:300'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'specs.*.label.required' => 'Nama spesifikasi wajib diisi.',
            'specs.*.value.required' => 'Nilai spesifikasi wajib diisi.',
        ];
    }
}
