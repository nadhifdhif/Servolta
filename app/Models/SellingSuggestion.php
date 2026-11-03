<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['type', 'target_id', 'pitch'])]
class SellingSuggestion extends Model
{
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'target_id');
    }
}
