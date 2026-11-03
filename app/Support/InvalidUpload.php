<?php

namespace App\Support;

use RuntimeException;

/** Kesalahan pada file unggahan; pesannya aman ditampilkan ke pengguna. */
class InvalidUpload extends RuntimeException
{
}
