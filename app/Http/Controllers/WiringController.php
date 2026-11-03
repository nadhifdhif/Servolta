<?php

namespace App\Http\Controllers;

use App\Http\Requests\WiringUploadRequest;
use App\Http\Resources\WiringDocumentResource;
use App\Models\Product;
use App\Models\WiringDocument;
use App\Support\ImageProcessor;
use App\Support\InvalidUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WiringController extends Controller
{
    public function index(Product $product): AnonymousResourceCollection
    {
        return WiringDocumentResource::collection($product->wiringDocuments()->orderBy('id')->get());
    }

    /**
     * File tersimpan di disk privat (tanpa URL publik). FE mengambilnya dengan token lalu
     * membuat blob URL, karena tag <img> tidak bisa mengirim header Authorization.
     */
    public function file(WiringDocument $wiringDocument): StreamedResponse
    {
        $disk = Storage::disk('local');
        abort_unless($disk->exists($wiringDocument->path), 404, 'File tidak ditemukan.');

        $name = (Str::slug($wiringDocument->title) ?: 'wiring').'.'.strtolower($wiringDocument->format);

        return $disk->response($wiringDocument->path, $name, [
            'Content-Type' => $wiringDocument->mime,
            'X-Content-Type-Options' => 'nosniff',
            // Lapisan tambahan untuk SVG: tidak boleh menjalankan skrip atau memuat sumber luar.
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; sandbox",
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    public function store(WiringUploadRequest $request, Product $product, ImageProcessor $images): JsonResponse
    {
        $file = $request->file('file');

        try {
            $processed = $images->process($file->getRealPath(), $file->getClientOriginalName());
        } catch (InvalidUpload $e) {
            throw ValidationException::withMessages(['file' => [$e->getMessage()]]);
        }

        $path = "wiring/{$product->id}/".Str::uuid().'.'.$processed['ext'];
        Storage::disk('local')->put($path, $processed['contents']);

        $document = $product->wiringDocuments()->create([
            'title' => $request->validated('title'),
            'rev' => $request->validated('rev') ?: '1',
            'format' => strtoupper($processed['ext']),
            'dimensions' => $processed['width'] ? "{$processed['width']} × {$processed['height']} px" : 'Vektor',
            'size' => strlen($processed['contents']),
            'note' => $processed['note'] ?: null,
            'path' => $path,
            'mime' => $processed['mime'],
            'uploaded_by' => $request->user()->id,
        ]);

        return (new WiringDocumentResource($document))->response()->setStatusCode(201);
    }

    public function destroy(WiringDocument $wiringDocument): Response
    {
        Storage::disk('local')->delete($wiringDocument->path);
        $wiringDocument->delete();

        return response()->noContent();
    }
}
