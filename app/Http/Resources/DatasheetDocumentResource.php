<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\DatasheetDocument */
class DatasheetDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'kind' => $this->kind,
            'title' => $this->title,
            'pages' => $this->pages,
            'size' => $this->size,
            'rev' => $this->rev,
            'date' => $this->updated_at?->toDateString(),
            'lang' => $this->lang,
        ];
    }
}
