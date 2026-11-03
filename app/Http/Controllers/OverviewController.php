<?php

namespace App\Http\Controllers;

use App\Models\DatasheetDocument;
use App\Models\Faq;
use App\Models\Product;
use App\Models\WiringDocument;
use Illuminate\Http\JsonResponse;

class OverviewController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['data' => [
            'faq' => Faq::query()->count(),
            'products' => Product::query()->count(),
            'wiring' => WiringDocument::query()->count(),
            'datasheet' => DatasheetDocument::query()->count(),
        ]]);
    }
}
