<?php

namespace App\Http\Controllers;

use App\Http\Requests\FaqRequest;
use App\Http\Resources\FaqResource;
use App\Models\Faq;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class FaqController extends Controller
{
    public function index(Product $product): AnonymousResourceCollection
    {
        return FaqResource::collection($product->faqs()->orderBy('id')->get());
    }

    public function store(FaqRequest $request, Product $product): JsonResponse
    {
        $faq = $product->faqs()->create($request->validated());

        return (new FaqResource($faq))->response()->setStatusCode(201);
    }

    public function update(FaqRequest $request, Faq $faq): FaqResource
    {
        $faq->update($request->validated());

        return new FaqResource($faq);
    }

    public function destroy(Faq $faq): Response
    {
        $faq->delete();

        return response()->noContent();
    }
}
