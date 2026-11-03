<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Http\Requests\SpecsRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    /**
     * Seluruh daftar dikirim sekaligus: pencarian SKU/nama (termasuk saran salah ketik)
     * dilakukan di FE. Cukup untuk ribuan produk; bila nanti jauh lebih besar, tambahkan ?q=.
     */
    public function index(): AnonymousResourceCollection
    {
        return ProductResource::collection(Product::query()->orderBy('sku')->get());
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $product = Product::query()->create($request->validated());

        return (new ProductResource($product))->response()->setStatusCode(201);
    }

    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $product->update($request->validated());

        return new ProductResource($product);
    }

    public function destroy(Product $product): Response
    {
        // Baris dokumen ikut terhapus oleh foreign key; file di storage dihapus manual.
        $paths = $product->wiringDocuments()->pluck('path')
            ->merge($product->datasheetDocuments()->pluck('path'))
            ->all();

        $product->delete();
        Storage::disk('local')->delete($paths);

        return response()->noContent();
    }

    public function updateSpecs(SpecsRequest $request, Product $product): JsonResponse
    {
        $product->specs = collect($request->validated('specs'))
            ->map(fn (array $row) => [$row['label'], $row['value']])
            ->values()
            ->all();
        $product->save();

        return response()->json(['data' => ['specs' => $product->specs]]);
    }
}
