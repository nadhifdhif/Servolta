<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    private function actAs(UserRole $role): static
    {
        return $this->actingAs(User::factory()->create(['role' => $role]), 'sanctum');
    }

    public function test_guest_cannot_list_products(): void
    {
        $this->getJson('/api/products')->assertUnauthorized();
    }

    public function test_every_role_can_list_products_sorted_by_sku(): void
    {
        Product::query()->create(['sku' => 'B-2', 'name' => 'Dua']);
        Product::query()->create(['sku' => 'A-1', 'name' => 'Satu']);

        foreach (UserRole::cases() as $role) {
            $this->actAs($role)->getJson('/api/products')
                ->assertOk()
                ->assertJsonPath('data.0.sku', 'A-1')
                ->assertJsonPath('data.1.sku', 'B-2')
                ->assertJsonStructure(['data' => [['id', 'sku', 'name']]]);
        }
    }

    public function test_every_role_except_intern_can_create_products(): void
    {
        $this->actAs(UserRole::Intern)->postJson('/api/products', ['sku' => 'X-1', 'name' => 'X'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Role Anda tidak boleh mengelola produk dan dokumen.');
        $this->assertDatabaseCount('products', 0);

        $writers = [UserRole::Admin, UserRole::Spv, UserRole::Ts, UserRole::Mo, UserRole::Cs, UserRole::Sales, UserRole::Konten];
        foreach ($writers as $i => $role) {
            $this->actAs($role)->postJson('/api/products', ['sku' => "SKU-{$i}", 'name' => 'Produk'])->assertCreated();
        }
        $this->assertDatabaseCount('products', count($writers));
    }

    public function test_sku_is_normalized_and_must_be_unique(): void
    {
        $this->actAs(UserRole::Spv)->postJson('/api/products', ['sku' => '  svr-1000 ', 'name' => 'Stabilizer'])
            ->assertCreated()
            ->assertJsonPath('data.sku', 'SVR-1000');

        $this->postJson('/api/products', ['sku' => 'SVR-1000', 'name' => 'Lain'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('sku');

        $this->postJson('/api/products', ['sku' => 'bad sku!', 'name' => 'Lain'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('sku');

        $this->postJson('/api/products', ['sku' => 'OK-1', 'name' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_update_keeps_own_sku_but_rejects_another_products_sku(): void
    {
        $a = Product::query()->create(['sku' => 'A-1', 'name' => 'Satu']);
        Product::query()->create(['sku' => 'B-2', 'name' => 'Dua']);

        $this->actAs(UserRole::Spv)->putJson("/api/products/{$a->id}", ['sku' => 'A-1', 'name' => 'Satu (baru)'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Satu (baru)');

        $this->putJson("/api/products/{$a->id}", ['sku' => 'B-2', 'name' => 'Satu'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('sku');
    }

    public function test_delete_product_cascades_to_faqs(): void
    {
        $p = Product::query()->create(['sku' => 'A-1', 'name' => 'Satu']);
        $p->faqs()->create(['category' => 'cs', 'question' => 'Q', 'answer' => 'A']);

        $this->actAs(UserRole::Intern)->deleteJson("/api/products/{$p->id}")->assertForbidden();

        $this->actAs(UserRole::Admin)->deleteJson("/api/products/{$p->id}")->assertNoContent();
        $this->assertDatabaseCount('products', 0);
        $this->assertDatabaseCount('faqs', 0);
    }

    public function test_specs_are_validated_and_returned_as_pairs(): void
    {
        $p = Product::query()->create(['sku' => 'A-1', 'name' => 'Satu']);

        $this->actAs(UserRole::Intern)->putJson("/api/products/{$p->id}/specs", ['specs' => []])->assertForbidden();

        $this->actAs(UserRole::Spv)->putJson("/api/products/{$p->id}/specs", ['specs' => [
            ['label' => 'Berat', 'value' => '9,5 kg'],
            ['label' => 'Garansi', 'value' => '1 tahun'],
        ]])->assertOk()->assertJsonPath('data.specs.0', ['Berat', '9,5 kg']);

        $this->putJson("/api/products/{$p->id}/specs", ['specs' => [['label' => '', 'value' => 'x']]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('specs.0.label');

        $this->actAs(UserRole::Intern)->getJson("/api/products/{$p->id}/datasheet")
            ->assertOk()
            ->assertJsonPath('data.specs.1', ['Garansi', '1 tahun'])
            ->assertJsonPath('data.documents', []);
    }

    public function test_overview_counts_everything(): void
    {
        $p = Product::query()->create(['sku' => 'A-1', 'name' => 'Satu']);
        $p->faqs()->create(['category' => 'ts', 'question' => 'Q', 'answer' => 'A']);

        $this->actAs(UserRole::Intern)->getJson('/api/overview')
            ->assertOk()
            ->assertExactJson(['data' => ['faq' => 1, 'products' => 1, 'wiring' => 0, 'datasheet' => 0]]);
    }
}
