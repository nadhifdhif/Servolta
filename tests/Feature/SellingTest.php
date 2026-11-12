<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\ProductSeeder;
use Database\Seeders\SellingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellingTest extends TestCase
{
    use RefreshDatabase;

    private Product $a;

    private Product $b;

    private Product $c;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Product::query()->create(['sku' => 'SVR-1000', 'name' => 'Stabilizer 1000VA']);
        $this->b = Product::query()->create(['sku' => 'SVR-2000', 'name' => 'Stabilizer 2000VA']);
        $this->c = Product::query()->create(['sku' => 'UPS-650', 'name' => 'UPS 650VA']);
    }

    private function actAs(UserRole $role): static
    {
        return $this->actingAs(User::factory()->create(['role' => $role]), 'sanctum');
    }

    private function payload(array $override = []): array
    {
        return array_merge(['type' => 'upsell', 'target_id' => $this->b->id, 'pitch' => 'Untuk beban besar.'], $override);
    }

    public function test_guest_is_rejected(): void
    {
        $this->getJson("/api/products/{$this->a->id}/selling")->assertUnauthorized();
        $this->postJson("/api/products/{$this->a->id}/selling", $this->payload())->assertUnauthorized();
    }

    public function test_every_role_can_read_with_target_details(): void
    {
        $this->a->sellingSuggestions()->create($this->payload());

        foreach (UserRole::cases() as $role) {
            $this->actAs($role)->getJson("/api/products/{$this->a->id}/selling")
                ->assertOk()
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.type', 'upsell')
                ->assertJsonPath('data.0.target.sku', 'SVR-2000')
                ->assertJsonStructure(['data' => [['id', 'product_id', 'type', 'target_id', 'target' => ['id', 'sku', 'name'], 'pitch', 'updated_at']]]);
        }
    }

    public function test_only_the_requested_product_is_listed(): void
    {
        $this->a->sellingSuggestions()->create($this->payload());
        $this->c->sellingSuggestions()->create($this->payload(['type' => 'cross', 'target_id' => $this->a->id]));

        $this->actAs(UserRole::Intern)->getJson("/api/products/{$this->c->id}/selling")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'cross');
    }

    public function test_intern_cannot_write_but_everyone_else_can(): void
    {
        $this->actAs(UserRole::Intern)
            ->postJson("/api/products/{$this->a->id}/selling", $this->payload())
            ->assertForbidden()
            ->assertJsonPath('message', 'Role Anda tidak boleh mengubah upselling dan cross selling.');
        $this->assertDatabaseCount('selling_suggestions', 0);

        $writers = [UserRole::Cs, UserRole::Ts, UserRole::Mo, UserRole::Sales, UserRole::Konten, UserRole::Spv, UserRole::Admin];
        foreach ($writers as $i => $role) {
            $target = Product::query()->create(['sku' => "TARGET-{$i}", 'name' => "Tujuan {$i}"]);

            $this->actAs($role)
                ->postJson("/api/products/{$this->a->id}/selling", $this->payload(['target_id' => $target->id]))
                ->assertCreated();
        }
        $this->assertDatabaseCount('selling_suggestions', count($writers));
    }

    public function test_validation_rules(): void
    {
        $url = "/api/products/{$this->a->id}/selling";
        $this->actAs(UserRole::Cs);

        $this->postJson($url, $this->payload(['type' => 'lain']))->assertStatus(422)->assertJsonValidationErrors('type');
        $this->postJson($url, $this->payload(['target_id' => $this->a->id]))->assertStatus(422)->assertJsonValidationErrors('target_id');
        $this->postJson($url, $this->payload(['target_id' => 9999]))->assertStatus(422)->assertJsonValidationErrors('target_id');
        $this->postJson($url, $this->payload(['pitch' => '']))->assertStatus(422)->assertJsonValidationErrors('pitch');
        $this->postJson($url, $this->payload(['pitch' => str_repeat('x', 1001)]))->assertStatus(422)->assertJsonValidationErrors('pitch');
        $this->assertDatabaseCount('selling_suggestions', 0);
    }

    public function test_same_target_twice_for_the_same_type_is_rejected_but_other_type_is_allowed(): void
    {
        $url = "/api/products/{$this->a->id}/selling";
        $this->actAs(UserRole::Cs);

        $this->postJson($url, $this->payload())->assertCreated();
        $this->postJson($url, $this->payload())->assertStatus(422)->assertJsonValidationErrors('target_id');
        $this->postJson($url, $this->payload(['type' => 'cross']))->assertCreated();
    }

    public function test_update_keeps_own_target_but_rejects_a_taken_one(): void
    {
        $first = $this->a->sellingSuggestions()->create($this->payload());
        $this->a->sellingSuggestions()->create($this->payload(['target_id' => $this->c->id]));

        $this->actAs(UserRole::Ts)
            ->putJson("/api/selling/{$first->id}", $this->payload(['pitch' => 'Pesan baru.']))
            ->assertOk()
            ->assertJsonPath('data.pitch', 'Pesan baru.')
            ->assertJsonPath('data.target.sku', 'SVR-2000');

        $this->putJson("/api/selling/{$first->id}", $this->payload(['target_id' => $this->c->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('target_id');

        // tujuan tidak boleh produk asal (diambil dari entri, bukan dari URL)
        $this->putJson("/api/selling/{$first->id}", $this->payload(['target_id' => $this->a->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('target_id');
    }

    public function test_update_and_delete_permissions(): void
    {
        $entry = $this->a->sellingSuggestions()->create($this->payload());

        $this->actAs(UserRole::Intern)->putJson("/api/selling/{$entry->id}", $this->payload())->assertForbidden();
        $this->deleteJson("/api/selling/{$entry->id}")->assertForbidden();

        $this->actAs(UserRole::Mo)->deleteJson("/api/selling/{$entry->id}")->assertNoContent();
        $this->assertDatabaseCount('selling_suggestions', 0);
        $this->putJson("/api/selling/{$entry->id}", $this->payload())->assertNotFound();
    }

    public function test_deleting_a_product_removes_suggestions_pointing_to_or_from_it(): void
    {
        $this->a->sellingSuggestions()->create($this->payload());                                   // a -> b
        $this->c->sellingSuggestions()->create($this->payload(['type' => 'cross', 'target_id' => $this->b->id])); // c -> b

        $this->actAs(UserRole::Spv)->deleteJson("/api/products/{$this->b->id}")->assertNoContent();

        $this->assertDatabaseCount('selling_suggestions', 0);
    }

    public function test_me_exposes_the_write_selling_permission(): void
    {
        $this->actAs(UserRole::Cs)->getJson('/api/me')->assertJsonPath('data.permissions.write_selling', true);
        $this->actAs(UserRole::Intern)->getJson('/api/me')->assertJsonPath('data.permissions.write_selling', false);
    }

    public function test_seeders_create_the_sample_suggestions(): void
    {
        $this->seed([ProductSeeder::class, SellingSeeder::class]);
        $this->seed(SellingSeeder::class); // aman dijalankan ulang

        $svr = Product::query()->where('sku', 'SVR-1000')->firstOrFail();
        $this->assertSame(2, $svr->sellingSuggestions()->count());
        $this->assertDatabaseCount('selling_suggestions', 8);
    }
}
