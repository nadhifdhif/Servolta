// Contoh kode sensor untuk tim (Arduino IDE). Konten statis dulu; nanti bisa dipindah ke database.
// Komentar di dalam kode memakai bahasa Indonesia supaya mudah dijelaskan ke customer.

const I2C_WIRING = (power) => [
  { pin: 'VCC', esp32: power, uno: power === '3V3' ? '3.3V' : '5V' },
  { pin: 'GND', esp32: 'GND', uno: 'GND' },
  { pin: 'SDA', esp32: 'GPIO 21', uno: 'A4' },
  { pin: 'SCL', esp32: 'GPIO 22', uno: 'A5' },
]

export const SNIPPETS = [
  {
    id: 'dht22',
    name: 'DHT22',
    kind: 'Suhu dan kelembapan',
    summary: 'Membaca suhu (°C) dan kelembapan (%) dan menampilkannya di Serial Monitor.',
    boards: ['ESP32', 'Arduino Uno'],
    libraries: [
      { name: 'DHT sensor library', by: 'Adafruit' },
      { name: 'Adafruit Unified Sensor', by: 'Adafruit' },
    ],
    wiring: [
      { pin: 'VCC', esp32: '3V3', uno: '5V' },
      { pin: 'DATA', esp32: 'GPIO 4', uno: 'D4' },
      { pin: 'GND', esp32: 'GND', uno: 'GND' },
    ],
    notes: [
      'Sensor tanpa papan modul (4 kaki) butuh resistor pull-up 10 kΩ antara DATA dan VCC. Modul 3 kaki sudah punya.',
      'DHT22 hanya bisa dibaca tiap 2 detik. Membaca lebih sering menghasilkan NaN.',
    ],
    warnings: [],
    code: `#include <DHT.h>

#define DHTPIN 4        // pin DATA sensor
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
}

void loop() {
  delay(2000);  // DHT22 maksimal dibaca tiap 2 detik

  float kelembapan = dht.readHumidity();
  float suhu = dht.readTemperature();  // dalam Celsius

  if (isnan(kelembapan) || isnan(suhu)) {
    Serial.println("Gagal membaca DHT22, cek kabel.");
    return;
  }

  Serial.print("Suhu: ");
  Serial.print(suhu, 1);
  Serial.print(" C  Kelembapan: ");
  Serial.print(kelembapan, 1);
  Serial.println(" %");
}
`,
  },
  {
    id: 'pzem004t',
    name: 'PZEM-004T v3.0',
    kind: 'Monitor listrik AC',
    summary:
      'Membaca tegangan, arus, daya, energi, frekuensi, dan faktor daya lewat komunikasi serial.',
    boards: ['ESP32'],
    libraries: [{ name: 'PZEM004Tv30', by: 'Jakub Mandula' }],
    wiring: [
      { pin: '5V', esp32: '5V (VIN)', uno: '—' },
      { pin: 'GND', esp32: 'GND', uno: '—' },
      { pin: 'TX (sensor)', esp32: 'GPIO 16 (RX2)', uno: '—' },
      { pin: 'RX (sensor)', esp32: 'GPIO 17 (TX2)', uno: '—' },
    ],
    notes: [
      'Sisi 5V/TX/RX adalah sisi aman (terisolasi). Sisi terminal AC dan CT terhubung ke listrik PLN.',
      'Jepit kabel fasa (L) saja pada CT, bukan kedua kabel sekaligus.',
      'Alamat bawaan 0xF8. Bila memakai beberapa PZEM di satu jalur, ubah alamatnya satu per satu lebih dulu.',
    ],
    warnings: [
      'Tegangan PLN berbahaya. Matikan MCB sebelum memasang kabel di terminal AC, dan jangan menyentuh terminal saat menyala.',
    ],
    code: `#include <PZEM004Tv30.h>

// ESP32: Serial2 dengan RX = GPIO 16, TX = GPIO 17
PZEM004Tv30 pzem(Serial2, 16, 17);

void setup() {
  Serial.begin(115200);
}

void loop() {
  float tegangan = pzem.voltage();   // V
  float arus = pzem.current();       // A
  float daya = pzem.power();         // W
  float energi = pzem.energy();      // kWh
  float frekuensi = pzem.frequency(); // Hz
  float pf = pzem.pf();              // faktor daya

  if (isnan(tegangan)) {
    Serial.println("PZEM tidak terbaca, cek kabel TX/RX dan catu 5V.");
  } else {
    Serial.printf("V=%.1f  I=%.3f A  P=%.1f W  E=%.3f kWh  f=%.1f Hz  PF=%.2f\\n",
                  tegangan, arus, daya, energi, frekuensi, pf);
  }

  delay(2000);
}
`,
  },
  {
    id: 'oled096',
    name: 'OLED 0.96" (SSD1306)',
    kind: 'Layar I2C 128×64',
    summary: 'Menampilkan teks dan penghitung detik di layar OLED I2C.',
    boards: ['ESP32', 'Arduino Uno'],
    libraries: [
      { name: 'Adafruit SSD1306', by: 'Adafruit' },
      { name: 'Adafruit GFX Library', by: 'Adafruit' },
    ],
    wiring: I2C_WIRING('3V3'),
    notes: [
      'Alamat I2C umumnya 0x3C; sebagian modul 0x3D. Bila layar tidak menyala, jalankan I2C scanner untuk memastikan.',
      'Modul 4 pin (VCC, GND, SCL, SDA) tidak butuh pin reset: biarkan OLED_RESET bernilai -1.',
    ],
    warnings: [],
    code: `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDRESS 0x3C   // sebagian modul memakai 0x3D

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

void setup() {
  Serial.begin(115200);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("OLED tidak ditemukan, cek kabel dan alamat I2C.");
    for (;;) {}
  }
  display.setTextColor(SSD1306_WHITE);
}

void loop() {
  display.clearDisplay();

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Servolta");

  display.setTextSize(2);
  display.setCursor(0, 20);
  display.print(millis() / 1000);
  display.println(" detik");

  display.display();
  delay(500);
}
`,
  },
  {
    id: 'mpu6050',
    name: 'MPU6050',
    kind: 'Akselerometer dan giroskop',
    summary: 'Membaca percepatan (m/s²), kecepatan sudut (rad/s), dan suhu chip.',
    boards: ['ESP32', 'Arduino Uno'],
    libraries: [
      { name: 'Adafruit MPU6050', by: 'Adafruit' },
      { name: 'Adafruit Unified Sensor', by: 'Adafruit' },
    ],
    wiring: [
      ...I2C_WIRING('3V3'),
      { pin: 'AD0', esp32: 'GND (alamat 0x68)', uno: 'GND (alamat 0x68)' },
    ],
    notes: [
      'AD0 ke GND memberi alamat 0x68 (bawaan library). AD0 ke VCC memberi 0x69.',
      'Letakkan sensor diam saat dinyalakan. Percepatan sumbu Z yang diam bernilai sekitar 9,8 m/s².',
    ],
    warnings: [],
    code: `#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);

  if (!mpu.begin()) {
    Serial.println("MPU6050 tidak ditemukan, cek kabel SDA/SCL.");
    while (true) {
      delay(10);
    }
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
}

void loop() {
  sensors_event_t a, g, suhu;
  mpu.getEvent(&a, &g, &suhu);

  Serial.print("Akselerasi X/Y/Z: ");
  Serial.print(a.acceleration.x, 2);
  Serial.print(" / ");
  Serial.print(a.acceleration.y, 2);
  Serial.print(" / ");
  Serial.print(a.acceleration.z, 2);
  Serial.println(" m/s^2");

  Serial.print("Giroskop X/Y/Z: ");
  Serial.print(g.gyro.x, 2);
  Serial.print(" / ");
  Serial.print(g.gyro.y, 2);
  Serial.print(" / ");
  Serial.print(g.gyro.z, 2);
  Serial.println(" rad/s");

  Serial.print("Suhu chip: ");
  Serial.print(suhu.temperature, 1);
  Serial.println(" C");

  delay(500);
}
`,
  },
  {
    id: 'dht22-oled',
    name: 'DHT22 + OLED 0.96"',
    kind: 'Contoh gabungan',
    summary: 'Suhu dan kelembapan dari DHT22 ditampilkan di layar OLED.',
    boards: ['ESP32', 'Arduino Uno'],
    libraries: [
      { name: 'DHT sensor library', by: 'Adafruit' },
      { name: 'Adafruit Unified Sensor', by: 'Adafruit' },
      { name: 'Adafruit SSD1306', by: 'Adafruit' },
      { name: 'Adafruit GFX Library', by: 'Adafruit' },
    ],
    wiring: [
      { pin: 'DHT22 DATA', esp32: 'GPIO 4', uno: 'D4' },
      { pin: 'OLED SDA', esp32: 'GPIO 21', uno: 'A4' },
      { pin: 'OLED SCL', esp32: 'GPIO 22', uno: 'A5' },
      { pin: 'VCC (keduanya)', esp32: '3V3', uno: '5V' },
      { pin: 'GND (keduanya)', esp32: 'GND', uno: 'GND' },
    ],
    notes: [
      'Pada Arduino Uno, OLED tetap dihubungkan ke 5V hanya bila modulnya mendukung 5V. Cek tulisan di PCB.',
    ],
    warnings: [],
    code: `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22
#define OLED_ADDRESS 0x3C

DHT dht(DHTPIN, DHTTYPE);
Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  Serial.begin(115200);
  dht.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("OLED tidak ditemukan.");
    for (;;) {}
  }
  display.setTextColor(SSD1306_WHITE);
}

void loop() {
  delay(2000);

  float kelembapan = dht.readHumidity();
  float suhu = dht.readTemperature();

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);

  if (isnan(kelembapan) || isnan(suhu)) {
    display.println("DHT22 tidak terbaca");
  } else {
    display.println("Suhu dan kelembapan");
    display.setTextSize(2);
    display.setCursor(0, 18);
    display.print(suhu, 1);
    display.println(" C");
    display.print(kelembapan, 0);
    display.println(" %");
  }

  display.display();
}
`,
  },
]

export const findSnippet = (id) => SNIPPETS.find((s) => s.id === id) ?? null
