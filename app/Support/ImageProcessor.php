<?php

namespace App\Support;

/**
 * Menyiapkan gambar wiring sebelum disimpan: cek isi file, putar sesuai EXIF,
 * hapus metadata (termasuk lokasi GPS), kecilkan bila terlalu besar, dan ubah
 * HEIC/TIFF/dll. menjadi JPG. Tidak bergantung pada framework agar mudah diuji.
 */
final class ImageProcessor
{
    public const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'heic', 'heif', 'bmp', 'tif', 'tiff', 'avif'];

    public const MAX_SIDE = 2400;

    /** Batas piksel hasil dekode, supaya gambar "raksasa" tidak menghabiskan memori. */
    public const MAX_PIXELS = 50_000_000;

    /**
     * @return array{contents: string, ext: string, mime: string, width: ?int, height: ?int, note: string}
     */
    public function process(string $path, string $originalName): array
    {
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if (! in_array($ext, self::ALLOWED, true)) {
            throw new InvalidUpload('Format belum didukung. Gunakan JPG, PNG, WebP, GIF, SVG, atau HEIC.');
        }

        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            throw new InvalidUpload('File kosong atau tidak dapat dibaca.');
        }

        if ($ext === 'svg') {
            return $this->svg($raw);
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($raw);
        if (! is_string($mime) || ! str_starts_with($mime, 'image/')) {
            throw new InvalidUpload('Isi file bukan gambar yang valid.');
        }

        return class_exists(\Imagick::class)
            ? $this->withImagick($raw, $ext)
            : $this->withGd($raw, $ext);
    }

    /** @return array{contents: string, ext: string, mime: string, width: ?int, height: ?int, note: string} */
    private function svg(string $raw): array
    {
        if (stripos($raw, '<svg') === false) {
            throw new InvalidUpload('Isi file bukan SVG yang valid.');
        }

        // Daftar tolak sederhana. SVG tetap hanya ditampilkan lewat <img>/blob (skrip tidak
        // berjalan) dan dikirim dengan CSP sandbox; pemeriksaan ini lapisan tambahan.
        $blocked = [
            '/<\s*script/i',
            '/<\s*foreignObject/i',
            '/<\s*(iframe|embed|object)\b/i',
            '/\bon[a-z]+\s*=/i',
            '/javascript\s*:/i',
            '/<!ENTITY/i',
            '/(?:xlink:)?href\s*=\s*["\']\s*(?!#)/i',
        ];
        foreach ($blocked as $pattern) {
            if (preg_match($pattern, $raw)) {
                throw new InvalidUpload('SVG berisi elemen yang tidak diizinkan (skrip atau referensi luar).');
            }
        }

        return ['contents' => $raw, 'ext' => 'svg', 'mime' => 'image/svg+xml', 'width' => null, 'height' => null, 'note' => ''];
    }

    /** @return array{contents: string, ext: string, mime: string, width: ?int, height: ?int, note: string} */
    private function withImagick(string $raw, string $ext): array
    {
        try {
            $image = new \Imagick();
            $image->readImageBlob($raw);
        } catch (\ImagickException) {
            throw new InvalidUpload('Gambar tidak dapat dibaca. Pastikan file tidak rusak.');
        }

        $origW = $image->getImageWidth();
        $origH = $image->getImageHeight();
        $this->guardPixels($origW, $origH);

        // GIF animasi dibiarkan apa adanya.
        if ($ext === 'gif' && $image->getNumberImages() > 1) {
            return ['contents' => $raw, 'ext' => 'gif', 'mime' => 'image/gif', 'width' => $origW, 'height' => $origH, 'note' => ''];
        }

        $image->setIteratorIndex(0);
        if (method_exists($image, 'autoOrient')) {
            $image->autoOrient();
        }

        $target = $this->targetFormat($ext);
        if ($target === 'jpg') {
            $image->setImageBackgroundColor('white');
            $image = $image->mergeImageLayers(\Imagick::LAYERMETHOD_FLATTEN);
        }

        $resized = false;
        if (max($image->getImageWidth(), $image->getImageHeight()) > self::MAX_SIDE) {
            $image->scaleImage(self::MAX_SIDE, self::MAX_SIDE, true);
            $resized = true;
        }

        $image->stripImage(); // metadata, termasuk GPS
        $image->setImageFormat($target === 'jpg' ? 'jpeg' : $target);
        if ($target !== 'png') {
            $image->setImageCompressionQuality(85);
        }

        $contents = $image->getImagesBlob();

        return $this->result($contents, $target, $image->getImageWidth(), $image->getImageHeight(), $ext, $origW, $origH, $resized);
    }

    /** @return array{contents: string, ext: string, mime: string, width: ?int, height: ?int, note: string} */
    private function withGd(string $raw, string $ext): array
    {
        if (in_array($ext, ['heic', 'heif', 'tif', 'tiff'], true)) {
            throw new InvalidUpload(
                'Format '.strtoupper($ext).' belum bisa diproses di server ini. Ubah ke JPG/PNG dulu, atau minta admin memasang ekstensi Imagick.'
            );
        }

        $info = @getimagesizefromstring($raw);
        if ($info === false) {
            throw new InvalidUpload('Gambar tidak dapat dibaca. Pastikan file tidak rusak.');
        }
        [$origW, $origH] = $info;
        $this->guardPixels($origW, $origH);

        // GIF disimpan apa adanya (GD tidak menjaga animasi).
        if ($ext === 'gif') {
            return ['contents' => $raw, 'ext' => 'gif', 'mime' => 'image/gif', 'width' => $origW, 'height' => $origH, 'note' => ''];
        }

        $image = @imagecreatefromstring($raw);
        if ($image === false) {
            throw new InvalidUpload('Gambar tidak dapat dibaca. Pastikan file tidak rusak.');
        }

        if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
            $image = $this->rotateByExif($image, $raw);
        }

        $resized = false;
        if (max(imagesx($image), imagesy($image)) > self::MAX_SIDE) {
            $scaled = imagescale($image, imagesx($image) >= imagesy($image) ? self::MAX_SIDE : -1, imagesx($image) >= imagesy($image) ? -1 : self::MAX_SIDE);
            if ($scaled !== false) {
                $image = $scaled;
                $resized = true;
            }
        }

        $target = $this->targetFormat($ext);
        // Menulis ulang piksel membuang seluruh metadata (EXIF/GPS).
        ob_start();
        match ($target) {
            'png' => $this->encodePng($image),
            'webp' => imagewebp($image, null, 85),
            default => imagejpeg($this->flatten($image), null, 85),
        };
        $contents = (string) ob_get_clean();

        return $this->result($contents, $target, imagesx($image), imagesy($image), $ext, $origW, $origH, $resized);
    }

    private function targetFormat(string $ext): string
    {
        return match ($ext) {
            'png' => 'png',
            'webp' => 'webp',
            'gif', 'bmp' => 'png',
            default => 'jpg', // jpg, jpeg, heic, heif, tif, tiff, avif
        };
    }

    private function guardPixels(int $width, int $height): void
    {
        if ($width < 1 || $height < 1 || $width * $height > self::MAX_PIXELS) {
            throw new InvalidUpload('Dimensi gambar terlalu besar. Perkecil dulu sebelum diunggah.');
        }
    }

    private function encodePng(\GdImage $image): void
    {
        imagesavealpha($image, true);
        imagepng($image, null, 6);
    }

    private function flatten(\GdImage $image): \GdImage
    {
        $flat = imagecreatetruecolor(imagesx($image), imagesy($image));
        imagefill($flat, 0, 0, imagecolorallocate($flat, 255, 255, 255));
        imagecopy($flat, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));

        return $flat;
    }

    private function rotateByExif(\GdImage $image, string $raw): \GdImage
    {
        $exif = @exif_read_data('data://image/jpeg;base64,'.base64_encode($raw));
        $angle = match ($exif['Orientation'] ?? 1) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };
        if ($angle === 0) {
            return $image;
        }
        $rotated = imagerotate($image, $angle, 0);

        return $rotated === false ? $image : $rotated;
    }

    /** @return array{contents: string, ext: string, mime: string, width: ?int, height: ?int, note: string} */
    private function result(string $contents, string $target, int $w, int $h, string $srcExt, int $origW, int $origH, bool $resized): array
    {
        $notes = [];
        $source = $srcExt === 'jpeg' ? 'jpg' : $srcExt;
        if ($source !== $target) {
            $notes[] = 'Diunggah sebagai '.strtoupper($source).', diubah otomatis ke '.strtoupper($target);
        }
        if ($resized) {
            $notes[] = "Foto {$origW} × {$origH} px, diperkecil otomatis";
        }

        return [
            'contents' => $contents,
            'ext' => $target,
            'mime' => match ($target) {
                'png' => 'image/png',
                'webp' => 'image/webp',
                default => 'image/jpeg',
            },
            'width' => $w,
            'height' => $h,
            'note' => implode('. ', $notes),
        ];
    }
}
