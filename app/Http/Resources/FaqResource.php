<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Faq */
class FaqResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'category' => $this->category,
            'question' => $this->question,
            'answer' => $this->answer,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
