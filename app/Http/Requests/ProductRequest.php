<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    // Izin (write_products) dicek oleh middleware EnsurePermission di rute.
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('sku'))) {
            $this->merge(['sku' => strtoupper(trim($this->input('sku')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $current = $this->route('product');

        return [
            'sku' => [
                'required', 'string', 'max:50',
                'regex:/^[A-Z0-9][A-Z0-9._\-\/]*$/',
                Rule::unique('products', 'sku')->ignore($current?->id),
            ],
            'name' => ['required', 'string', 'max:150'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'sku.required' => 'SKU wajib diisi.',
            'sku.regex' => 'SKU hanya boleh huruf, angka, titik, garis bawah, strip, dan garis miring.',
            'sku.unique' => 'SKU ini sudah dipakai produk lain.',
            'name.required' => 'Nama produk wajib diisi.',
        ];
    }
}
