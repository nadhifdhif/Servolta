<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DatasheetUploadRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:150'],
            'rev' => ['nullable', 'string', 'max:20'],
            'kind' => ['nullable', 'in:datasheet,guide'],
            'file' => ['required', 'file', 'max:20480', 'extensions:pdf', 'mimetypes:application/pdf'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Judul wajib diisi.',
            'file.required' => 'Pilih file PDF terlebih dahulu.',
            'file.uploaded' => 'Unggahan gagal. File mungkin melebihi batas ukuran server.',
            'file.max' => 'Ukuran PDF maksimal 20 MB.',
            'file.extensions' => 'Datasheet harus berupa file PDF.',
            'file.mimetypes' => 'Datasheet harus berupa file PDF.',
        ];
    }
}
