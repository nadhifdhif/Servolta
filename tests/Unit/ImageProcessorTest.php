<?php

namespace Tests\Unit;

use App\Support\ImageProcessor;
use App\Support\InvalidUpload;
use App\Support\PdfInfo;
use PHPUnit\Framework\TestCase;

class ImageProcessorTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('Ekstensi GD tidak tersedia.');
        }
    }

    private function tmp(string $data): string
    {
        $file = tempnam(sys_get_temp_dir(), 'img');
        file_put_contents($file, $data);

        return $file;
    }

    private function jpeg(int $w, int $h): string
    {
        $image = imagecreatetruecolor($w, $h);
        ob_start();
        imagejpeg($image);

        return (string) ob_get_clean();
    }

    public function test_jpeg_stays_jpeg(): void
    {
        $r = (new ImageProcessor())->process($this->tmp($this->jpeg(800, 600)), 'foto.JPG');

        $this->assertSame('jpg', $r['ext']);
        $this->assertSame('image/jpeg', $r['mime']);
        $this->assertSame(800, $r['width']);
        $this->assertSame('', $r['note']);
    }

    public function test_large_images_are_downscaled(): void
    {
        $r = (new ImageProcessor())->process($this->tmp($this->jpeg(4000, 3000)), 'besar.jpeg');

        $this->assertSame(ImageProcessor::MAX_SIDE, max($r['width'], $r['height']));
        $this->assertStringContainsString('diperkecil', $r['note']);
    }

    public function test_gps_metadata_is_removed(): void
    {
        $jpeg = $this->jpeg(100, 100);
        $app1 = "Exif\0\0GPSLatitude-test-data";
        $jpeg = substr($jpeg, 0, 2)."\xFF\xE1".pack('n', strlen($app1) + 2).$app1.substr($jpeg, 2);
        $this->assertStringContainsString('GPSLatitude', $jpeg);

        $r = (new ImageProcessor())->process($this->tmp($jpeg), 'gps.jpg');

        $this->assertStringNotContainsString('GPSLatitude', $r['contents']);
    }

    public function test_rejects_wrong_extension_fake_images_and_empty_files(): void
    {
        $processor = new ImageProcessor();

        foreach ([['x', 'a.pdf'], ['bukan gambar', 'a.png'], ['', 'a.png']] as [$data, $name]) {
            try {
                $processor->process($this->tmp($data), $name);
                $this->fail("Seharusnya ditolak: {$name}");
            } catch (InvalidUpload) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_dangerous_svg_is_rejected_and_clean_svg_accepted(): void
    {
        $processor = new ImageProcessor();

        $ok = $processor->process($this->tmp('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'), 'a.svg');
        $this->assertSame('image/svg+xml', $ok['mime']);

        foreach ([
            '<svg><script>alert(1)</script></svg>',
            '<svg onload="alert(1)"></svg>',
            '<svg><a href="javascript:alert(1)"/></svg>',
            '<svg><image href="http://evil.test/x.png"/></svg>',
            '<svg><foreignObject><div/></foreignObject></svg>',
        ] as $bad) {
            try {
                $processor->process($this->tmp($bad), 'a.svg');
                $this->fail("SVG berbahaya lolos: {$bad}");
            } catch (InvalidUpload) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_pdf_info(): void
    {
        $pdf = "%PDF-1.4\n1 0 obj\n<< /Type /Pages /Count 2 >>\nendobj\n2 0 obj\n<< /Type /Page >>\nendobj\n3 0 obj\n<< /Type /Page >>\nendobj\n%%EOF";

        $this->assertTrue(PdfInfo::isPdf($this->tmp($pdf)));
        $this->assertFalse(PdfInfo::isPdf($this->tmp('MZ....')));
        $this->assertSame(2, PdfInfo::pageCount($this->tmp($pdf)));
    }
}
