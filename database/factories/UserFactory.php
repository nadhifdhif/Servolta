<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Support\LoginCode;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'login_code' => LoginCode::generate(10),
            'password' => static::$password ??= Hash::make('password'),
            'role' => UserRole::Intern,
            'is_active' => true,
            'must_change_password' => false,
            'remember_token' => null,
        ];
    }
}
