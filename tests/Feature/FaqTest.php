<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FaqTest extends TestCase
{
    use RefreshDatabase;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->product = Product::query()->create(['sku' => 'SVR-1000', 'name' => 'Stabilizer']);
    }

    private function actAs(UserRole $role): static
    {
        return $this->actingAs(User::factory()->create(['role' => $role]), 'sanctum');
    }

    private function payload(array $override = []): array
    {
        return array_merge(['category' => 'cs', 'question' => 'Berapa garansinya?', 'answer' => '1 tahun.'], $override);
    }

    public function test_guest_is_rejected(): void
    {
        $this->getJson("/api/products/{$this->product->id}/faqs")->assertUnauthorized();
        $this->postJson("/api/products/{$this->product->id}/faqs", $this->payload())->assertUnauthorized();
    }

    public function test_everyone_can_read_faqs_of_a_product_only(): void
    {
        $other = Product::query()->create(['sku' => 'UPS-650', 'name' => 'UPS']);
        $this->product->faqs()->create($this->payload());
        $other->faqs()->create($this->payload(['question' => 'Lain']));

        $this->actAs(UserRole::Intern)->getJson("/api/products/{$this->product->id}/faqs")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonStructure(['data' => [['id', 'product_id', 'category', 'question', 'answer', 'updated_at']]])
            ->assertJsonPath('data.0.question', 'Berapa garansinya?');
    }

    public function test_intern_cannot_write_but_other_roles_can(): void
    {
        $this->actAs(UserRole::Intern)
            ->postJson("/api/products/{$this->product->id}/faqs", $this->payload())
            ->assertForbidden()
            ->assertJsonPath('message', 'Role Anda tidak boleh mengubah FAQ.');

        foreach ([UserRole::Cs, UserRole::Ts, UserRole::Mo, UserRole::Sales, UserRole::Konten, UserRole::Spv, UserRole::Admin] as $role) {
            $this->actAs($role)
                ->postJson("/api/products/{$this->product->id}/faqs", $this->payload())
                ->assertCreated()
                ->assertJsonPath('data.product_id', $this->product->id);
        }
        $this->assertDatabaseCount('faqs', 7);
    }

    public function test_validation_errors_use_the_expected_shape(): void
    {
        $this->actAs(UserRole::Cs)
            ->postJson("/api/products/{$this->product->id}/faqs", ['category' => 'xx', 'question' => '', 'answer' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category', 'question', 'answer']);
    }

    public function test_update_and_delete(): void
    {
        $faq = $this->product->faqs()->create($this->payload());

        $this->actAs(UserRole::Intern)->putJson("/api/faqs/{$faq->id}", $this->payload())->assertForbidden();
        $this->deleteJson("/api/faqs/{$faq->id}")->assertForbidden();

        $this->actAs(UserRole::Ts)->putJson("/api/faqs/{$faq->id}", $this->payload(['category' => 'ts', 'answer' => 'Dua tahun.']))
            ->assertOk()
            ->assertJsonPath('data.category', 'ts')
            ->assertJsonPath('data.answer', 'Dua tahun.');

        $this->deleteJson("/api/faqs/{$faq->id}")->assertNoContent();
        $this->assertDatabaseCount('faqs', 0);
        $this->putJson("/api/faqs/{$faq->id}", $this->payload())->assertNotFound();
    }
}
