<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku', 50)->unique();
            $table->string('name', 150);
            // Spesifikasi ringkas: daftar pasangan [label, nilai].
            $table->json('specs')->nullable();
            $table->timestamps();
        });

        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('category', 2); // cs = Customer Service, ts = Technical Support
            $table->string('question', 500);
            $table->text('answer');
            $table->timestamps();

            $table->index(['product_id', 'category']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE faqs ADD CONSTRAINT faqs_category_check CHECK (category IN ('cs','ts'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('faqs');
        Schema::dropIfExists('products');
    }
};
