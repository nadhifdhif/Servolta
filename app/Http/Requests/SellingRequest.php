<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SellingRequest extends FormRequest
{
    // Izin (write_selling) dicek oleh middleware EnsurePermission di rute.
    public function authorize(): bool
    {
        return true;
    }

    /** id produk asal: dari rute tambah ({product}) atau dari entri yang diubah. */
    private function productId(): int
    {
        $suggestion = $this->route('sellingSuggestion');

        return (int) ($suggestion?->product_id ?? $this->route('product')?->id);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $productId = $this->productId();

        return [
            'type' => ['required', 'in:upsell,cross'],
            'target_id' => [
                'required', 'integer',
                Rule::exists('products', 'id'),
                Rule::notIn([$productId]),
                Rule::unique('selling_suggestions', 'target_id')
                    ->where(fn ($query) => $query->where('product_id', $productId)->where('type', $this->input('type')))
                    ->ignore($this->route('sellingSuggestion')?->id),
            ],
            'pitch' => ['required', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'type.required' => 'Jenis wajib dipilih.',
            'type.in' => 'Jenis tidak valid.',
            'target_id.required' => 'Pilih produk tujuan.',
            'target_id.exists' => 'Produk tujuan tidak ditemukan.',
            'target_id.not_in' => 'Produk tujuan tidak boleh sama dengan produk ini.',
            'target_id.unique' => 'Produk ini sudah ada di daftar.',
            'pitch.required' => 'Pesan untuk customer wajib diisi.',
            'pitch.max' => 'Maksimal 1000 karakter.',
        ];
    }
}
