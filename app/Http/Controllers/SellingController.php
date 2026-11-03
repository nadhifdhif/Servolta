<?php

namespace App\Http\Controllers;

use App\Http\Requests\SellingRequest;
use App\Http\Resources\SellingSuggestionResource;
use App\Models\Product;
use App\Models\SellingSuggestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class SellingController extends Controller
{
    public function index(Product $product): AnonymousResourceCollection
    {
        return SellingSuggestionResource::collection(
            $product->sellingSuggestions()->with('target')->orderBy('id')->get()
        );
    }

    public function store(SellingRequest $request, Product $product): JsonResponse
    {
        $suggestion = $product->sellingSuggestions()->create($request->validated());

        return (new SellingSuggestionResource($suggestion->load('target')))->response()->setStatusCode(201);
    }

    public function update(SellingRequest $request, SellingSuggestion $sellingSuggestion): SellingSuggestionResource
    {
        $sellingSuggestion->update($request->validated());

        return new SellingSuggestionResource($sellingSuggestion->load('target'));
    }

    public function destroy(SellingSuggestion $sellingSuggestion): Response
    {
        $sellingSuggestion->delete();

        return response()->noContent();
    }
}
