<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('login_code', 40)->nullable(); // kode yang diketik (bisa salah/tidak terdaftar)
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->boolean('success');
            $table->string('reason', 20)->nullable(); // unknown_code | wrong_password | locked | inactive
            $table->timestamp('created_at')->useCurrent();

            $table->index('created_at');
            $table->index('login_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_attempts');
    }
};
