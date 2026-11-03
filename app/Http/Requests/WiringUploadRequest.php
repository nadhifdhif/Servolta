<?php

namespace App\Http\Requests;

use App\Support\ImageProcessor;
use Illuminate\Foundation\Http\FormRequest;

class WiringUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Isi file diperiksa lebih dalam oleh ImageProcessor; di sini hanya pagar awal.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'rev' => ['nullable', 'string', 'max:20'],
            'file' => ['required', 'file', 'max:15360', 'extensions:'.implode(',', ImageProcessor::ALLOWED)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Judul wajib diisi.',
            'file.required' => 'Pilih file gambar terlebih dahulu.',
            'file.uploaded' => 'Unggahan gagal. File mungkin melebihi batas ukuran server.',
            'file.max' => 'Ukuran gambar maksimal 15 MB.',
            'file.extensions' => 'Format belum didukung. Gunakan JPG, PNG, WebP, GIF, SVG, atau HEIC.',
        ];
    }
}
