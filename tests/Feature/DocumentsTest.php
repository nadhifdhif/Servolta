<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\DatasheetDocument;
use App\Models\Product;
use App\Models\User;
use App\Models\WiringDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Membutuhkan ekstensi GD (dipakai UploadedFile::fake()->image dan pemrosesan gambar). */
class DocumentsTest extends TestCase
{
    use RefreshDatabase;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->product = Product::query()->create(['sku' => 'SVR-2000', 'name' => 'Stabilizer 2000VA']);
    }

    private function actAs(UserRole $role): static
    {
        return $this->actingAs(User::factory()->create(['role' => $role]), 'sanctum');
    }

    private function upload(string $url, array $data)
    {
        return $this->post($url, $data, ['Accept' => 'application/json']);
    }

    private function pdf(string $name = 'ds.pdf'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nendobj\n%%EOF");
    }

    // ---------- wiring ----------

    public function test_privileged_role_uploads_a_wiring_image(): void
    {
        $response = $this->actAs(UserRole::Spv)->upload("/api/products/{$this->product->id}/wiring", [
            'title' => 'Instalasi dasar',
            'rev' => '2',
            'file' => UploadedFile::fake()->image('wiring.png', 800, 600),
        ])->assertCreated()
            ->assertJsonPath('data.format', 'PNG')
            ->assertJsonPath('data.dimensions', '800 × 600 px')
            ->assertJsonPath('data.rev', '2')
            ->assertJsonPath('data.kind', 'image');

        $document = WiringDocument::query()->findOrFail($response->json('data.id'));
        Storage::disk('local')->assertExists($document->path);
        $this->assertEquals($document->size, Storage::disk('local')->size($document->path));
    }

    public function test_readers_can_fetch_the_file_but_not_upload_or_delete(): void
    {
        $id = $this->actAs(UserRole::Admin)->upload("/api/products/{$this->product->id}/wiring", [
            'title' => 'Foto', 'file' => UploadedFile::fake()->image('a.jpg', 100, 100),
        ])->json('data.id');

        $this->actAs(UserRole::Cs)->get("/api/wiring/{$id}/file")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->upload("/api/products/{$this->product->id}/wiring", [
            'title' => 'X', 'file' => UploadedFile::fake()->image('b.png'),
        ])->assertForbidden();
        $this->deleteJson("/api/wiring/{$id}")->assertForbidden();

        $this->getJson("/api/products/{$this->product->id}/wiring")->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_guest_cannot_fetch_files(): void
    {
        $this->getJson('/api/wiring/1/file')->assertUnauthorized();
        $this->getJson('/api/datasheet-documents/1/file')->assertUnauthorized();
    }

    public function test_wiring_rejects_wrong_formats_and_dangerous_svg(): void
    {
        $url = "/api/products/{$this->product->id}/wiring";
        $this->actAs(UserRole::Spv);

        $this->upload($url, ['title' => 'x', 'file' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')])
            ->assertStatus(422)->assertJsonValidationErrors('file');

        $this->upload($url, ['title' => 'x', 'file' => UploadedFile::fake()->createWithContent('a.png', 'bukan gambar')])
            ->assertStatus(422)->assertJsonValidationErrors('file');

        $this->upload($url, ['title' => 'x', 'file' => UploadedFile::fake()->createWithContent('a.svg', '<svg><script>alert(1)</script></svg>')])
            ->assertStatus(422)->assertJsonValidationErrors('file');

        $this->upload($url, ['title' => '', 'file' => UploadedFile::fake()->image('a.png')])
            ->assertStatus(422)->assertJsonValidationErrors('title');

        $this->upload($url, ['title' => 'x', 'file' => UploadedFile::fake()->image('big.png')->size(16 * 1024)])
            ->assertStatus(422)->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('wiring_documents', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_clean_svg_is_accepted(): void
    {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';

        $this->actAs(UserRole::Spv)->upload("/api/products/{$this->product->id}/wiring", [
            'title' => 'Diagram', 'file' => UploadedFile::fake()->createWithContent('d.svg', $svg),
        ])->assertCreated()->assertJsonPath('data.format', 'SVG')->assertJsonPath('data.dimensions', 'Vektor');
    }

    public function test_deleting_a_wiring_document_removes_its_file(): void
    {
        $id = $this->actAs(UserRole::Spv)->upload("/api/products/{$this->product->id}/wiring", [
            'title' => 'Foto', 'file' => UploadedFile::fake()->image('a.png'),
        ])->json('data.id');
        $path = WiringDocument::query()->findOrFail($id)->path;

        $this->deleteJson("/api/wiring/{$id}")->assertNoContent();

        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseCount('wiring_documents', 0);
        $this->getJson("/api/wiring/{$id}/file")->assertNotFound();
    }

    // ---------- datasheet ----------

    public function test_privileged_role_uploads_a_pdf_and_everyone_can_download_it(): void
    {
        $id = $this->actAs(UserRole::Spv)->upload("/api/products/{$this->product->id}/datasheet-documents", [
            'title' => 'Datasheet SVR-2000', 'rev' => '3', 'file' => $this->pdf(),
        ])->assertCreated()
            ->assertJsonPath('data.pages', 1)
            ->assertJsonPath('data.rev', '3')
            ->assertJsonPath('data.kind', 'datasheet')
            ->json('data.id');

        $this->actAs(UserRole::Intern)->get("/api/datasheet-documents/{$id}/file")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->getJson("/api/products/{$this->product->id}/datasheet")
            ->assertOk()
            ->assertJsonCount(1, 'data.documents')
            ->assertJsonPath('data.documents.0.title', 'Datasheet SVR-2000');
    }

    public function test_datasheet_accepts_only_real_pdfs_from_privileged_roles(): void
    {
        $url = "/api/products/{$this->product->id}/datasheet-documents";

        $this->actAs(UserRole::Cs)->upload($url, ['title' => 'x', 'file' => $this->pdf()])->assertForbidden();

        $this->actAs(UserRole::Spv);
        $this->upload($url, ['title' => 'x', 'file' => UploadedFile::fake()->image('a.png')])
            ->assertStatus(422)->assertJsonValidationErrors('file');
        $this->upload($url, ['title' => 'x', 'file' => UploadedFile::fake()->createWithContent('a.pdf', 'bukan pdf')])
            ->assertStatus(422)->assertJsonValidationErrors('file');
        $this->upload($url, ['title' => '', 'file' => $this->pdf()])
            ->assertStatus(422)->assertJsonValidationErrors('title');

        $this->assertDatabaseCount('datasheet_documents', 0);
    }

    public function test_deleting_a_document_or_product_removes_files(): void
    {
        $this->actAs(UserRole::Admin);
        $a = $this->upload("/api/products/{$this->product->id}/datasheet-documents", ['title' => 'A', 'file' => $this->pdf()])->json('data.id');
        $b = $this->upload("/api/products/{$this->product->id}/wiring", ['title' => 'B', 'file' => UploadedFile::fake()->image('b.png')])->json('data.id');
        $pathA = DatasheetDocument::query()->findOrFail($a)->path;
        $pathB = WiringDocument::query()->findOrFail($b)->path;

        $this->deleteJson("/api/datasheet-documents/{$a}")->assertNoContent();
        Storage::disk('local')->assertMissing($pathA);

        $this->deleteJson("/api/products/{$this->product->id}")->assertNoContent();
        Storage::disk('local')->assertMissing($pathB);
        $this->assertDatabaseCount('wiring_documents', 0);
    }

    public function test_overview_includes_document_counts(): void
    {
        $this->actAs(UserRole::Spv);
        $this->upload("/api/products/{$this->product->id}/datasheet-documents", ['title' => 'A', 'file' => $this->pdf()])->assertCreated();
        $this->upload("/api/products/{$this->product->id}/wiring", ['title' => 'B', 'file' => UploadedFile::fake()->image('b.png')])->assertCreated();

        $this->getJson('/api/overview')->assertOk()
            ->assertJsonPath('data.wiring', 1)
            ->assertJsonPath('data.datasheet', 1);
    }
}
