# VoteNext TFT Arduino - Complete Code

โค้ด Arduino สำหรับจอ TFT ที่สมบูรณ์สำหรับระบบ VoteNext สามารถดึงข้อมูลห้องและโหวตได้จริง

## คุณสมบัติหลัก

### ✅ ฟีเจอร์ที่ทำงานได้
- **เชื่อมต่อ WiFi** และ WebSocket กับ Server
- **ดึงรายการ Show/ห้อง** จาก Server ผ่าน HTTP API
- **รับข้อมูลโพล/รอบโหวต** แบบ Real-time ผ่าน WebSocket
- **แสดงตัวเลือกโหวต** พร้อมรูปภาพ (4 ตัวเลือกต่อหน้า)
- **ส่งโหวต** ไปยัง Server ผ่าน HTTP API
- **ดูผลโหวต** แบบ Real-time
- **Touch Screen** รองรับการแตะและปัดเลื่อน
- **Thai Font Support** รองรับภาษาไทยถ้ามี font ใน LittleFS

### 🎨 UI หน้าจอ
1. **Splash Screen** - หน้าเริ่มต้นแสดงโลโก้
2. **Status Screen** - แสดงสถานะการเชื่อมต่อ
3. **Poll List** - รายการ Show/ห้องที่เปิดโหวต
4. **Vote Screen** - หน้าโหวต แสดงตัวเลือกพร้อมรูป
5. **Result Screen** - แสดงผลโหวต

## การตั้งค่า

### 1. WiFi และ Server
```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* SERVER_HOST = "192.168.1.100";  // IP ของ Server
const uint16_t SERVER_PORT = 4000;
```

### 2. Hardware Pinout
```cpp
#define PIN_PWR_BTN 13    // ปุ่มเปิด/ปิด
#define PIN_LED_R 25      // LED สีแดง
#define PIN_LED_G 26      // LED สีเขียว
#define PIN_LED_B 27      // LED สีน้ำเงง
#define PIN_TFT_BL 32     // Backlight จอ TFT
```

### 3. Server API Endpoints
ที่ Arduino จะเรียกใช้:

- `GET /api/shows` - ดึงรายการ Show ทั้งหมด
- `GET /api/device/active?showId=xxx` - ดึงโพลที่เปิดอยู่
- `POST /api/device/vote` - ส่งโหวต
- `GET /api/public/vote/{roundId}/rank` - ดูผลโหวต

### 4. WebSocket Events
- `ws://server:4000/ws/device?deviceId=ESP32-XXXX`

Messages ที่รับ:
```json
{
  "type": "active",
  "payload": {
    "showId": "uuid",
    "roundId": "uuid", 
    "title": "Round 1",
    "choices": [
      {
        "id": "contestant1",
        "label": "ผู้เข้าแข่งขัน 1",
        "imageUrl": "http://server/image1.jpg"
      }
    ]
  }
}
```

## การติดตั้ง

### 1. Libraries ที่ต้องติดตั้ง
```json
{
  "dependencies": [
    "WiFi",
    "WebSocketsClient",
    "ArduinoJson",
    "HTTPClient",
    "Preferences",
    "FS",
    "LittleFS",
    "TFT_eSPI",
    "JPEGDecoder"
  ]
}
```

### 2. LittleFS Setup
อัปโหลดไฟล์ต่อไปนี้ไปยัง LittleFS:
- `/THSarabunNew24.vlw` - Thai font (ถ้าต้องการรองรับภาษาไทย)

### 3. TFT_eSPI Configuration
แก้ไข `User_Setup.h` ใน library TFT_eSPI:
```cpp
#define ILI9341_DRIVER
#define TFT_WIDTH  240
#define TFT_HEIGHT 320
#define TFT_MISO 19
#define TFT_MOSI 23
#define TFT_SCLK 18
#define TFT_CS   5
#define TFT_DC   2
#define TFT_RST  4
#define TOUCH_CS 15
```

## การใช้งาน

### 1. เริ่มต้น
1. อัปโหลดโค้ดไปยัง ESP32
2. เปิดเครื่อง จอแสดง Splash Screen
3. รอเชื่อมต่อ WiFi (LED เขียวกระพริบ)
4. เชื่อมต่อ WebSocket อัตโนมัติ

### 2. การทำงาน
1. **หน้า Status** - แสดงสถานะการเชื่อมต่อ
2. กด "เข้าร่วมโหวต" → ไปหน้า Poll List
3. เลือก Show/ห้อง → กด "เข้าร่วมโหวต"
4. รอ Server เปิดโพล → แสดงหน้า Vote
5. เลือกตัวเลือก → กด "โหวต"
6. แสดง Modal ยืนยัน → ดูผลหรือกลับหน้าหลัก

### 3. Touch Controls
- **แตะ** - เลือกเมนู/ปุ่ม
- **ปัดขึ้น/ลง** - เลื่อนรายการ Show
- **ปัดซ้าย/ขวา** - เปลี่ยนหน้าตัวเลือกโหวต
- **กดค้างปุ่ม Power** - ลบ Touch Calibration

## Server Integration

### Response Format ที่ Arduino คาดหวัง

#### GET /api/shows
```json
[
  {
    "id": "show-uuid",
    "title": "รายการโหวต A",
    "status": "voting",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### WebSocket "active" payload
```json
{
  "showId": "show-uuid",
  "roundId": "round-uuid",
  "title": "Round 1",
  "choices": [
    {
      "id": "choice1",
      "label": "ตัวเลือก 1",
      "imageUrl": "http://server/img1.jpg"
    }
  ]
}
```

#### POST /api/device/vote
```json
{
  "deviceId": "ESP32-1234",
  "showId": "show-uuid", 
  "roundId": "round-uuid",
  "contestantId": "choice1"
}
```

## Troubleshooting

### ปัญหาทั่วไป
1. **WiFiไม่เชื่อมต่อ** - ตรวจสอบ SSID/PASSWORD
2. **WebSocketไม่เชื่อมต่อ** - ตรวจสอบ IP/Port Server
3. **ไม่แสดงภาษาไทย** - อัปโหลด font ไปยัง LittleFS
4. **Touchไม่ทำงาน** - ทำ Calibration ใหม่ (กดค้างปุ่ม Power ตอนเปิดเครื่อง)

### Debug Serial Output
เปิด Serial Monitor (115200 baud) เพื่อดู:
- WiFi connection status
- WebSocket messages
- API responses
- Image download progress

## Files Structure
```
VoteNext/
├── arduino_tft_vote_complete.ino    # Main code
├── ui_types.h                       # UI definitions
├── lologo.h                         # Logo data (placeholder)
├── README.md                        # This file
└── data/                            # LittleFS data
    └── THSarabunNew24.vlw          # Thai font
```

## Notes
- โค้ดนี้รองรับ ESP32 ที่มีจอ TFT ILI9341 และ Touch Screen
- รูปภาพจะถูกดาวน์โหลดและเก็บใน LittleFS แคชไว้
- สามารถทำงานได้โดยไม่ต้องมี Server (แสดงข้อความ error)
- รองรับการโหวตซ้ำ (Server จะปฏิเสธด้วย HTTP 409)
