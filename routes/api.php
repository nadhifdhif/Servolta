<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DatasheetController;
use App\Http\Controllers\FaqController;
use App\Http\Controllers\LoginAttemptController;
use App\Http\Controllers\OverviewController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SellingController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WiringController;
use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

// Batas login: 5 percobaan per menit untuk kombinasi kode + IP (menahan tebak sandi pada satu akun),
// dan batas IP yang lebih longgar (kantor dengan satu IP tidak boleh saling mengunci).
RateLimiter::for('login', function (Request $request) {
    $tooMany = fn (Request $request, array $headers) => response()->json(
        ['message' => 'Terlalu banyak percobaan masuk. Coba lagi sebentar lagi.'],
        429,
        $headers,
    );

    return [
        Limit::perMinute(5)->by('login|'.strtoupper(trim((string) $request->input('code'))).'|'.$request->ip())->response($tooMany),
        Limit::perMinute(60)->by('login-ip|'.$request->ip())->response($tooMany),
    ];
});

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware(['auth:sanctum', EnsureUserIsActive::class, EnsurePasswordChanged::class])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/logout-all', [AuthController::class, 'logoutAll']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::put('/me/password', [AuthController::class, 'changePassword'])->middleware('throttle:10,1');

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

    // Pengguna: admin (semua role) dan supervisor (staf di bawahnya).
    Route::middleware(EnsurePermission::class.':manage_users')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::post('/users/{user}/unlock', [UserController::class, 'unlock']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });

    // Riwayat percobaan masuk: hanya Admin.
    Route::get('/login-attempts', [LoginAttemptController::class, 'index'])
        ->middleware(EnsurePermission::class.':view_logs');

    // Upselling & cross selling: semua role kecuali intern.
    Route::middleware(EnsurePermission::class.':write_selling')->group(function () {
        Route::post('/products/{product}/selling', [SellingController::class, 'store']);
        Route::put('/selling/{sellingSuggestion}', [SellingController::class, 'update']);
        Route::delete('/selling/{sellingSuggestion}', [SellingController::class, 'destroy']);
    });

    // Semua role selain intern boleh menulis SKU, spesifikasi, wiring, dan datasheet.
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
