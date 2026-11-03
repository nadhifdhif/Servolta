<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['sku', 'name', 'specs'])]
class Product extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['specs' => 'array'];
    }

    public function faqs(): HasMany
    {
        return $this->hasMany(Faq::class);
    }

    /** Saran upselling & cross selling milik produk ini (produk ini sebagai asal). */
    public function sellingSuggestions(): HasMany
    {
        return $this->hasMany(SellingSuggestion::class);
    }

    public function wiringDocuments(): HasMany
    {
        return $this->hasMany(WiringDocument::class);
    }

    public function datasheetDocuments(): HasMany
    {
        return $this->hasMany(DatasheetDocument::class);
    }
}
