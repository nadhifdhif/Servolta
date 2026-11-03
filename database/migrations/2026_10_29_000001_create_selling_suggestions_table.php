<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('selling_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('target_id')->constrained('products')->cascadeOnDelete();
            $table->string('type', 6); // upsell | cross
            $table->text('pitch');     // pesan siap salin untuk customer
            $table->timestamps();

            // Satu produk tujuan hanya sekali per jenis untuk produk yang sama.
            $table->unique(['product_id', 'target_id', 'type']);
            $table->index('product_id');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE selling_suggestions ADD CONSTRAINT selling_suggestions_type_check CHECK (type IN ('upsell','cross'))");
            DB::statement('ALTER TABLE selling_suggestions ADD CONSTRAINT selling_suggestions_not_self_check CHECK (product_id <> target_id)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('selling_suggestions');
    }
};
