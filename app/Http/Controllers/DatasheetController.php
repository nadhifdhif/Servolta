<?php

namespace App\Http\Controllers;

use App\Http\Requests\DatasheetUploadRequest;
use App\Http\Resources\DatasheetDocumentResource;
use App\Models\DatasheetDocument;
use App\Models\Product;
use App\Support\PdfInfo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DatasheetController extends Controller
{
    public function show(Product $product): JsonResponse
    {
        return response()->json(['data' => [
            'specs' => $product->specs ?? [],
            'documents' => DatasheetDocumentResource::collection(
                $product->datasheetDocuments()->orderBy('id')->get()
            )->resolve(),
        ]]);
    }

    public function file(DatasheetDocument $datasheetDocument): StreamedResponse
    {
        $disk = Storage::disk('local');
        abort_unless($disk->exists($datasheetDocument->path), 404, 'File tidak ditemukan.');

        $name = (Str::slug($datasheetDocument->title) ?: 'dokumen').'.pdf';

        return $disk->response($datasheetDocument->path, $name, [
            'Content-Type' => 'application/pdf',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    public function store(DatasheetUploadRequest $request, Product $product): JsonResponse
    {
        $file = $request->file('file');

        if (! PdfInfo::isPdf($file->getRealPath())) {
            throw ValidationException::withMessages(['file' => ['Datasheet harus berupa file PDF.']]);
        }

        $path = Storage::disk('local')->putFileAs("datasheet/{$product->id}", $file, Str::uuid().'.pdf');

        $document = $product->datasheetDocuments()->create([
            'kind' => $request->validated('kind') ?: 'datasheet',
            'title' => $request->validated('title'),
            'pages' => PdfInfo::pageCount($file->getRealPath()),
            'size' => $file->getSize(),
            'rev' => $request->validated('rev') ?: '1',
            'path' => $path,
            'uploaded_by' => $request->user()->id,
        ]);

        return (new DatasheetDocumentResource($document))->response()->setStatusCode(201);
    }

    public function destroy(DatasheetDocument $datasheetDocument): Response
    {
        Storage::disk('local')->delete($datasheetDocument->path);
        $datasheetDocument->delete();

        return response()->noContent();
    }
}
