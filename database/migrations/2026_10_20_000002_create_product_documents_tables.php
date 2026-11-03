<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wiring_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('title', 150);
            $table->string('tag', 40)->default('Instalasi');
            $table->string('rev', 20)->default('1');
            $table->string('format', 10);              // JPG, PNG, WEBP, GIF, SVG
            $table->string('dimensions', 40)->nullable();
            $table->unsignedBigInteger('size');        // byte, setelah diproses
            $table->string('note', 255)->nullable();
            $table->string('path');                    // relatif ke disk "local" (privat)
            $table->string('mime', 60);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('product_id');
        });

        Schema::create('datasheet_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 10)->default('datasheet'); // datasheet | guide
            $table->string('title', 150);
            $table->unsignedSmallInteger('pages')->nullable();
            $table->unsignedBigInteger('size');
            $table->string('rev', 20)->default('1');
            $table->string('lang', 30)->default('Indonesia');
            $table->string('path');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('product_id');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE datasheet_documents ADD CONSTRAINT datasheet_documents_kind_check CHECK (kind IN ('datasheet','guide'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('datasheet_documents');
        Schema::dropIfExists('wiring_documents');
    }
};
