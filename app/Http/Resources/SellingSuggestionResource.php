<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\SellingSuggestion */
class SellingSuggestionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'type' => $this->type,
            'target_id' => $this->target_id,
            'target' => [
                'id' => $this->target->id,
                'sku' => $this->target->sku,
                'name' => $this->target->name,
            ],
            'pitch' => $this->pitch,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
