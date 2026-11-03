<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DatasheetController;
use App\Http\Controllers\FaqController;
use App\Http\Controllers\OverviewController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SellingController;
use App\Http\Controllers\WiringController;
use App\Http\Middleware\EnsurePermission;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Dapat dibaca semua role yang sudah login.
    Route::get('/overview', OverviewController::class);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}/faqs', [FaqController::class, 'index']);
    Route::get('/products/{product}/selling', [SellingController::class, 'index']);
    Route::get('/products/{product}/wiring', [WiringController::class, 'index']);
    Route::get('/wiring/{wiringDocument}/file', [WiringController::class, 'file']);
    Route::get('/products/{product}/datasheet', [DatasheetController::class, 'show']);
    Route::get('/datasheet-documents/{datasheetDocument}/file', [DatasheetController::class, 'file']);

    // FAQ: semua role kecuali intern.
    Route::middleware(EnsurePermission::class.':write_faq')->group(function () {
        Route::post('/products/{product}/faqs', [FaqController::class, 'store']);
        Route::put('/faqs/{faq}', [FaqController::class, 'update']);
        Route::delete('/faqs/{faq}', [FaqController::class, 'destroy']);
    });

    // Upselling & cross selling: semua role kecuali intern.
    Route::middleware(EnsurePermission::class.':write_selling')->group(function () {
        Route::post('/products/{product}/selling', [SellingController::class, 'store']);
        Route::put('/selling/{sellingSuggestion}', [SellingController::class, 'update']);
        Route::delete('/selling/{sellingSuggestion}', [SellingController::class, 'destroy']);
    });

    // Produk, spesifikasi, wiring, datasheet: spv, admin, superadmin.
    Route::middleware(EnsurePermission::class.':write_products')->group(function () {
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::put('/products/{product}/specs', [ProductController::class, 'updateSpecs']);

        Route::middleware('throttle:30,1')->group(function () {
            Route::post('/products/{product}/wiring', [WiringController::class, 'store']);
            Route::post('/products/{product}/datasheet-documents', [DatasheetController::class, 'store']);
        });
        Route::delete('/wiring/{wiringDocument}', [WiringController::class, 'destroy']);
        Route::delete('/datasheet-documents/{datasheetDocument}', [DatasheetController::class, 'destroy']);
    });
});
