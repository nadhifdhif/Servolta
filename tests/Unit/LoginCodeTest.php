<?php

namespace Tests\Unit;

use App\Support\LoginCode;
use PHPUnit\Framework\TestCase;

class LoginCodeTest extends TestCase
{
    public function test_generated_codes_use_only_unambiguous_characters_and_the_requested_length(): void
    {
        for ($i = 0; $i < 200; $i++) {
            $code = LoginCode::generate();
            $this->assertSame(8, strlen($code));
            $this->assertMatchesRegularExpression('/^['.LoginCode::ALPHABET.']+$/', $code);
            $this->assertTrue(LoginCode::isValid($code));
            $this->assertDoesNotMatchRegularExpression('/[ILO01]/', $code);
        }
        $this->assertSame(12, strlen(LoginCode::generate(12)));
    }

    public function test_codes_are_not_repeated_in_practice(): void
    {
        $codes = array_map(fn () => LoginCode::generate(), range(1, 500));

        $this->assertCount(500, array_unique($codes));
    }

    public function test_normalize_and_validate(): void
    {
        $this->assertSame('ABC123', LoginCode::normalize('  abc123 '));
        $this->assertSame('', LoginCode::normalize(null));

        $this->assertTrue(LoginCode::isValid('AB12'));
        $this->assertFalse(LoginCode::isValid('AB1'));          // terlalu pendek
        $this->assertFalse(LoginCode::isValid(str_repeat('A', 21)));
        $this->assertFalse(LoginCode::isValid('ab12'));         // harus huruf besar
        $this->assertFalse(LoginCode::isValid('AB-12'));
        $this->assertFalse(LoginCode::isValid('AB 12'));
    }
}
