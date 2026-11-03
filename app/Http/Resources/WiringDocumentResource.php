<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\WiringDocument */
class WiringDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'kind' => 'image',
            'title' => $this->title,
            'tag' => $this->tag,
            'rev' => $this->rev,
            'date' => $this->updated_at?->toDateString(),
            'format' => $this->format,
            'dimensions' => $this->dimensions ?? '',
            'size' => $this->size,
            'note' => $this->note ?? '',
            'previewable' => true, // semua format disimpan dalam bentuk yang bisa ditampilkan browser
        ];
    }
}
