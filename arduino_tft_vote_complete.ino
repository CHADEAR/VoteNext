#include <WiFi.h>

// ✅ FIX 1: เพิ่มขนาด WS buffer กัน payload ใหญ่ (หลาย choice + imageUrl) แล้วถูกตัด
#ifndef WEBSOCKETS_MAX_DATA_SIZE
#define WEBSOCKETS_MAX_DATA_SIZE 32768
#endif
#include <WebSocketsClient.h>

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <FS.h>
#include <LittleFS.h>

#include <TFT_eSPI.h>
#include <JPEGDecoder.h>

#include "ui_types.h"
#include "lologo.h"

// ===================== TFT / ROTATION =====================
#define TFT_ROTATION 1

// ================= WIFI / SERVER =================
const char* WIFI_SSID = "KIRANA6738";
const char* WIFI_PASS = "65010086";
const char* SERVER_HOST = "192.168.137.1";
const uint16_t SERVER_PORT = 4000;

String DEFAULT_SHOW_ID = "ใส่ SHOW_UUID ของรายการ";
static const char* SHOWS_HTTP_PATH = "/api/shows";

// ================= PINS =================
#define PIN_PWR_BTN 13
#define PIN_LED_R 25
#define PIN_LED_G 26
#define PIN_LED_B 27
#define PIN_TFT_BL 32
#define TFT_BACKLIGHT_ON HIGH

// ================= OBJECTS =================
TFT_eSPI tft = TFT_eSPI();
WebSocketsClient ws;
Preferences prefs;

// ===== Thai smooth font on LittleFS =====
static const char* THAI_FONT_NAME = "THSarabunNew24";
static const char* THAI_FONT_FILE = "/THSarabunNew24.vlw";
bool thaiFontReady = false;
bool littlefsReady = false;

// ================= LIMITS =================
#define MAX_SHOWS 30
#define MAX_CHOICES 20

// ================= STATE =================
bool screenOn = true;
bool wsConnected = false;
bool pollOpen = false;

// ✅ NEW: กัน modal โดน redraw ทับ + กันแตะทะลุ
bool voteModalOpen = false;

// ----- Choice (รองรับรูป) -----
struct Choice {
  String id;
  String label;
  String imgUrl;   // url จาก server (ต้องมี)
  String imgPath;  // path ใน LittleFS
  bool imgReady;
};
Choice choices[MAX_CHOICES];
int choiceCount = 0;
int voteScroll = 0;  // สำหรับเลื่อน choice (ทีละ 4)

String roundTitle = "";
String roundId = "";
String SHOW_ID = "";

// ✅ เพิ่ม: เก็บชื่อโชว์ที่เลือก เพื่อใช้เป็นหัวข้อหน้า Vote ให้ตรง Figma
String selectedShowTitle = "";

// -------- Poll list (shows) ----------
struct ShowItem {
  String id;
  String title;
  String status;
  String createdAt;
};
ShowItem shows[MAX_SHOWS];
int showCount = 0;
int showScroll = 0;  // index ของรายการแรกที่แสดงในหน้าจอ

// ================= UI =================
UiScreen ui = SCR_SPLASH;

UIRect BTN_JOIN;
UIRect BTN_HOME;
UIRect BTN_BACK;
UIRect BTN_JOIN_POLL;
UIRect BTN_DONE;
UIRect BTN_VIEW;

// ปุ่มเลื่อน (หน้า Poll list)
UIRect BTN_UP;
UIRect BTN_DN;

// ✅ เพิ่ม: ปุ่มเลื่อนหน้า (หน้า Vote)
UIRect BTN_VPREV;
UIRect BTN_VNEXT;

// ---- Colors ----
uint16_t C_BG, C_TEXT, C_MUTED, C_BTN, C_BTN_TEXT, C_CARD, C_BORDER, C_BLUE, C_GREEN;

// สีสถานะ (ตาม Figma)
uint16_t C_ST_PENDING, C_ST_VOTING, C_ST_CLOSED;

// ===== Toast/Redraw guard =====
uint32_t toastHoldUntil = 0;
volatile bool statusDirty = false;

// ===== Touch drag for scroll =====
static bool touchDown = false;
static uint16_t touchStartX = 0, touchStartY = 0;
static uint16_t lastTouchX = 0, lastTouchY = 0;
static bool didDrag = false;
static uint32_t touchStartMs = 0;

// ===== choice image preload =====
static bool needImagePreload = false;
static int imgDlIndex = 0;

// ================== JPEG RENDER ==================
static void renderJPEG(int xpos, int ypos);
static void drawArrayJpegCentered(const uint8_t arrayname[], uint32_t array_size);

// ✅ เพิ่ม: JPEG clip render (แก้รูป "ล้นกรอบ")
static void renderJPEGClip(int16_t xpos, int16_t ypos,
                           int16_t clipX, int16_t clipY, int16_t clipW, int16_t clipH);
static bool drawJpegFromFSInBox(const String& path, int boxX, int boxY, int boxW, int boxH);

// ================== WS forward ==================
void wsEvent(WStype_t type, uint8_t* payload, size_t length);

// ================== UI prototypes ==================
void drawSplash();
void drawStatus();
void drawPoll();
void drawVote();
void drawResult();
void goScreen(UiScreen s);
void showVoteModal();
void sendVote(int idx);
void handleTap(uint16_t x, uint16_t y);
void handleTouch();

// ================== JSON helpers ==================
static inline const char* pickCStr(JsonVariantConst obj,
                                   const char* k1,
                                   const char* k2 = nullptr,
                                   const char* k3 = nullptr,
                                   const char* k4 = nullptr,
                                   const char* k5 = nullptr,
                                   const char* def = "") {
  const char* v = nullptr;

  if (k1) {
    v = obj[k1] | (const char*)nullptr;
    if (v && v[0]) return v;
  }
  if (k2) {
    v = obj[k2] | (const char*)nullptr;
    if (v && v[0]) return v;
  }
  if (k3) {
    v = obj[k3] | (const char*)nullptr;
    if (v && v[0]) return v;
  }
  if (k4) {
    v = obj[k4] | (const char*)nullptr;
    if (v && v[0]) return v;
  }
  if (k5) {
    v = obj[k5] | (const char*)nullptr;
    if (v && v[0]) return v;
  }

  return def;
}

static inline String pickStr(JsonVariantConst obj,
                             const char* k1,
                             const char* k2 = nullptr,
                             const char* k3 = nullptr,
                             const char* k4 = nullptr,
                             const char* k5 = nullptr,
                             const char* def = "") {
  return String(pickCStr(obj, k1, k2, k3, k4, k5, def));
}

// =================================================
// RGB LED (Common Cathode): HIGH = ON, LOW = OFF
// =================================================
void rgbWrite(bool rOn, bool gOn, bool bOn) {
  digitalWrite(PIN_LED_R, rOn ? HIGH : LOW);
  digitalWrite(PIN_LED_G, gOn ? HIGH : LOW);
  digitalWrite(PIN_LED_B, bOn ? HIGH : LOW);
}
void ledBoot() {
  rgbWrite(false, false, true);
}
void ledConnecting() {
  rgbWrite(false, true, false);
}
void ledDisconnected() {
  rgbWrite(true, false, false);
}
void ledVoteFlash() {
  rgbWrite(true, false, true);
}
void ledOff() {
  rgbWrite(false, false, false);
}

String deviceId() {
  uint64_t mac = ESP.getEfuseMac();
  char buf[32];
  snprintf(buf, sizeof(buf), "ESP32-%04X%08X", (uint16_t)(mac >> 32), (uint32_t)mac);
  return String(buf);
}

void setBacklightHW(bool on) {
  pinMode(PIN_TFT_BL, OUTPUT);
  digitalWrite(PIN_TFT_BL, on ? TFT_BACKLIGHT_ON : !TFT_BACKLIGHT_ON);
}

void tftSleep(bool sleepOn) {
  if (sleepOn) {
    tft.writecommand(0x28);
    delay(10);
    tft.writecommand(0x10);
    delay(120);
  } else {
    tft.writecommand(0x11);
    delay(120);
    tft.writecommand(0x29);
    delay(10);
  }
}

// ================== TEXT (Thai auto) ==================
static inline bool isUTF8Text(const String& s) {
  for (size_t i = 0; i < s.length(); i++) {
    if ((uint8_t)s[i] & 0x80) return true;
  }
  return false;
}

static inline void drawTextAuto(const String& s, int32_t x, int32_t y, uint8_t builtinFont, uint8_t datum) {
  tft.setTextDatum(datum);
  if (thaiFontReady && isUTF8Text(s)) tft.drawString(s, x, y);
  else tft.drawString(s, x, y, builtinFont);
  tft.setTextDatum(TL_DATUM);
}

// ================== THEME ==================
void uiInitTheme() {
  C_BG = TFT_WHITE;                          // Pure white background
  C_TEXT = TFT_BLACK;                        // Black text for high contrast
  C_MUTED = tft.color565(128, 128, 128);     // Gray for secondary text
  C_BTN = tft.color565(255, 200, 100);       // Light orange buttons
  C_BTN_TEXT = TFT_BLACK;                    // Black text on orange buttons
  C_CARD = TFT_WHITE;                        // White cards (same as background)
  C_BORDER = tft.color565(200, 200, 200);    // Light gray borders
  C_BLUE = TFT_BLACK;                        // Use black instead of blue
  C_GREEN = TFT_BLACK;                        // Use black instead of green

  // Status colors with actual colors
  C_ST_PENDING = tft.color565(255, 255, 200); // Light yellow
  C_ST_VOTING = tft.color565(200, 255, 200);   // Light green
  C_ST_CLOSED = tft.color565(255, 200, 200);   // Light red
}

void drawButton(const UIRect& r, const String& label, uint16_t fill, uint16_t textCol, uint8_t font = 2) {
  // Minimal button design - simple black rectangle with rounded corners
  tft.fillRoundRect(r.x, r.y, r.w, r.h, 8, fill);
  tft.setTextColor(textCol, fill);
  drawTextAuto(label, r.x + r.w / 2, r.y + r.h / 2, font, MC_DATUM);
}

void toast(const String& msg) {
  toastHoldUntil = millis() + 900;
  int w = tft.width(), h = tft.height();
  
  // Minimal toast - simple black bar at bottom
  tft.fillRect(0, h - 30, w, 30, TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  drawTextAuto(msg, w / 2, h - 15, 2, MC_DATUM);
}

// =============== helpers ===============
static inline String lowerStr(String s) {
  s.toLowerCase();
  return s;
}

static inline String shortDate(String s) {
  if (s.length() >= 10) return s.substring(0, 10);
  return s;
}

uint16_t statusColor(const String& stRaw) {
  String st = lowerStr(stRaw);
  // Use simple grayscale indicators instead of colors
  if (st == "pending" || st == "wait") return C_ST_PENDING;
  if (st == "voting" || st == "open" || st == "active") return C_ST_VOTING;
  if (st == "closed" || st == "done" || st == "finish") return C_ST_CLOSED;
  return C_ST_PENDING;
}

// ✅ helper: ตัดข้อความให้พอดีความกว้าง (ใส่ ...)
static String fitTextPxAuto(const String& s, int maxPx, uint8_t builtinFont) {
  int w = 0;
  if (thaiFontReady && isUTF8Text(s)) w = tft.textWidth(s);
  else w = tft.textWidth(s, builtinFont);

  if (w <= maxPx) return s;

  String out = s;
  while (out.length() > 0) {
    String trial = out + "...";
    int tw = (thaiFontReady && isUTF8Text(trial)) ? tft.textWidth(trial) : tft.textWidth(trial, builtinFont);
    if (tw <= maxPx) break;
    out.remove(out.length() - 1);
  }
  return out + "...";
}

// ✅ helper: เปรียบเทียบวันที่ YYYY-MM-DD (lexicographic ใช้ได้)
static bool dateNewer(const String& a, const String& b) {
  String da = shortDate(a);
  String db = shortDate(b);
  if (!da.length()) return false;
  if (!db.length()) return true;
  return da > db;
}

// ================== TOUCH CAL (bind rotation) ==================
static bool loadTouchCal(uint16_t cal[5], uint8_t rot) {
  Preferences p;
  p.begin("touch", true);
  uint8_t savedRot = p.getUChar("rot", 255);
  size_t len = p.getBytesLength("cal");
  if (savedRot != rot || len != sizeof(uint16_t) * 5) {
    p.end();
    return false;
  }
  p.getBytes("cal", cal, sizeof(uint16_t) * 5);
  p.end();
  return true;
}
static void saveTouchCal(const uint16_t cal[5], uint8_t rot) {
  Preferences p;
  p.begin("touch", false);
  p.putUChar("rot", rot);
  p.putBytes("cal", cal, sizeof(uint16_t) * 5);
  p.end();
}
static void clearTouchCal() {
  Preferences p;
  p.begin("touch", false);
  p.clear();
  p.end();
}

// ================== HTTP: fetch shows ==================
bool fetchShowsHTTP() {
  showCount = 0;
  showScroll = 0;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi not connected - cannot fetch shows");
    return false;
  }

  HTTPClient http;
  String url = String("http://") + SERVER_HOST + ":" + String(SERVER_PORT) + String(SHOWS_HTTP_PATH);
  
  Serial.printf("[HTTP] Fetching shows from: %s\n", url.c_str());
  http.begin(url);
  int code = http.GET();
  
  Serial.printf("[HTTP] Response code: %d\n", code);
  
  if (code <= 0) {
    Serial.printf("[HTTP] Error: %s\n", http.errorToString(code).c_str());
    http.end();
    return false;
  }

  String body = http.getString();
  Serial.printf("[HTTP] Response body length: %d\n", body.length());
  http.end();

  // ✅ ใช้ Dynamic กัน list ยาว
  DynamicJsonDocument doc(24576);
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    Serial.printf("[HTTP] JSON parse error: %s\n", err.c_str());
    return false;
  }

  JsonArrayConst arr;
  if (doc.is<JsonArray>()) arr = doc.as<JsonArrayConst>();
  else if (doc["data"].is<JsonArray>()) arr = doc["data"].as<JsonArrayConst>();
  else if (doc["shows"].is<JsonArray>()) arr = doc["shows"].as<JsonArrayConst>();
  else {
    Serial.println("[HTTP] No valid array found in response");
    return false;
  }

  Serial.printf("[HTTP] Found %d shows in response\n", arr.size());

  // dedup by title (ถ้าซ้ำ -> เก็บ createdAt ใหม่สุด)
  for (JsonVariantConst v : arr) {
    JsonVariantConst o = v;

    String id = pickStr(o, "id", "show_id", "showId", "uuid", nullptr, "");
    String title = pickStr(o, "title", "show_name", "name", "label", nullptr, id.c_str());
    String status = pickStr(o, "status", "show_status", nullptr, nullptr, nullptr, "pending");
    String createdAt = pickStr(o, "createdAt", "created_at", nullptr, nullptr, nullptr, "");

    if (!title.length()) continue;

    int found = -1;
    for (int i = 0; i < showCount; i++) {
      if (shows[i].title == title) {
        found = i;
        break;
      }
    }

    if (found < 0) {
      if (showCount >= MAX_SHOWS) break;
      shows[showCount++] = { id, title, status, createdAt };
      Serial.printf("[HTTP] Added show: %s (ID: %s, Status: %s)\n", title.c_str(), id.c_str(), status.c_str());
    } else {
      if (dateNewer(createdAt, shows[found].createdAt)) {
        shows[found] = { id, title, status, createdAt };
        Serial.printf("[HTTP] Updated show: %s\n", title.c_str());
      }
    }
  }

  Serial.printf("[HTTP] Total shows after processing: %d\n", showCount);
  return (showCount > 0);
}

// ================== WS ==================
void requestActivePoll() {
  if (!wsConnected || !screenOn) return;
  if (!SHOW_ID.length() || SHOW_ID == DEFAULT_SHOW_ID) {
    Serial.println("[WS] Cannot request active poll - no SHOW_ID");
    return;
  }

  StaticJsonDocument<256> doc;
  doc["type"] = "get_active";
  doc["showId"] = SHOW_ID;

  String out;
  serializeJson(doc, out);
  
  Serial.printf("[WS] Requesting active poll for showId: %s\n", SHOW_ID.c_str());
  Serial.printf("[WS] Sending: %s\n", out.c_str());
  ws.sendTXT(out);
}

// ขอผลโหวต (HTTP)
void requestResults() {
  if (!screenOn) return;
  if (!roundId.length()) {
    toast("ยังไม่มี roundId");
    return;
  }

  HTTPClient http;
  String url = String("http://") + SERVER_HOST + ":" + String(SERVER_PORT)
               + "/api/public/vote/" + roundId + "/rank";
  http.begin(url);

  int code = http.GET();
  String resp = http.getString();
  http.end();

  if (code != 200) {
    toast("ดึงผลไม่ได้: " + String(code));
    Serial.println(resp);
    return;
  }

  Serial.println(resp);
  toast("รับผลโหวตแล้ว");
}

void reconnectWs() {
  if (!screenOn) {
    Serial.println("[WS] Screen off - skipping reconnect");
    return;
  }
  
  String path = "/ws/device?deviceId=" + deviceId();
  Serial.printf("[WS] Connecting to %s:%d%s\n", SERVER_HOST, SERVER_PORT, path.c_str());
  Serial.printf("[WS] Device ID: %s\n", deviceId().c_str());
  
  ws.begin(SERVER_HOST, SERVER_PORT, path.c_str());
  ws.onEvent(wsEvent);
  ws.setReconnectInterval(2000);
  
  Serial.println("[WS] WebSocket connection initiated");
}

// ================== IMAGE DOWNLOAD (choices) ==================
String normalizeUrl(const String& u) {
  if (!u.length()) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return String("http://") + SERVER_HOST + ":" + String(SERVER_PORT) + u;
}

bool httpDownloadToFile(const String& urlRaw, const String& path) {
  if (!littlefsReady) return false;

  String url = normalizeUrl(urlRaw);
  if (!url.length()) return false;

  HTTPClient http;
  http.begin(url);
  int code = http.GET();
  if (code != 200) {
    http.end();
    return false;
  }

  File f = LittleFS.open(path, "w");
  if (!f) {
    http.end();
    return false;
  }

  WiFiClient* stream = http.getStreamPtr();
  uint8_t buff[512];
  int remaining = http.getSize();
  while (http.connected() && (remaining > 0 || remaining == -1)) {
    size_t avail = stream->available();
    if (avail) {
      int r = stream->readBytes(buff, (avail > sizeof(buff)) ? sizeof(buff) : avail);
      if (r > 0) f.write(buff, r);
      if (remaining > 0) remaining -= r;
    }
    delay(1);
  }
  f.close();
  http.end();
  return LittleFS.exists(path);
}

// เดิมยังเก็บไว้ เผื่อหน้าสแปลช/อื่น ๆ
bool drawJpegFromFS(const String& path, int x, int y) {
  if (!littlefsReady) return false;
  if (!LittleFS.exists(path)) return false;
  JpegDec.decodeFsFile(path.c_str());
  renderJPEG(x, y);
  return true;
}

// โหลดรูปแบบทยอย (กันค้าง)  ✅ FIX: อย่า redraw ทับ modal
void preloadChoiceImagesTick() {
  if (!needImagePreload) return;
  if (WiFi.status() != WL_CONNECTED) return;

  if (imgDlIndex >= choiceCount) {
    needImagePreload = false;
    if (ui == SCR_VOTE && !voteModalOpen) drawVote();
    return;
  }

  Choice& c = choices[imgDlIndex];
  if (c.imgUrl.length() && c.imgPath.length()) {
    if (LittleFS.exists(c.imgPath)) {
      c.imgReady = true;
    } else {
      bool ok = httpDownloadToFile(c.imgUrl, c.imgPath);
      c.imgReady = ok;
    }
  }
  imgDlIndex++;

  if (imgDlIndex >= choiceCount) {
    needImagePreload = false;
    if (ui == SCR_VOTE && !voteModalOpen) drawVote();
  }
}

// ================== UI: Screens ==================
void drawSplash() {
  voteModalOpen = false;
  tft.fillScreen(C_BG);
  drawArrayJpegCentered(lologo, sizeof(lologo));
}

void drawStatus() {
  voteModalOpen = false;
  tft.fillScreen(C_BG);

  // Minimal header
  tft.setTextColor(C_TEXT, C_BG);
  drawTextAuto("STATUS", tft.width() / 2, 30, 4, MC_DATUM);

  // Clean status list with simple text
  int x = 20, y = 70, lh = 22;
  
  // WiFi status
  tft.setTextColor(C_TEXT, C_BG);
  tft.setTextDatum(TL_DATUM);
  String wifiStatus = (WiFi.status() == WL_CONNECTED) ? "WiFi: Connected" : "WiFi: Disconnected";
  tft.drawString(wifiStatus, x, y, 2);
  y += lh;
  
  // WebSocket status
  String wsStatus = (wsConnected) ? "WS: Connected" : "WS: Disconnected";
  tft.drawString(wsStatus, x, y, 2);
  y += lh;
  
  // Poll status
  String pollStatus = (pollOpen) ? "Poll: Open" : "Poll: Closed";
  tft.drawString(pollStatus, x, y, 2);
  y += lh;
  
  // Device info
  tft.setTextColor(C_MUTED, C_BG);
  tft.drawString("Device: " + deviceId(), x, y, 2);

  BTN_JOIN = { (int16_t)(tft.width() / 2 - 100), (int16_t)(tft.height() - 60), 200, 40 };
  drawButton(BTN_JOIN, "เข้าร่วมโหวต", C_BTN, C_BTN_TEXT, 2);
}

// วาดการ์ดรายการโพล (หลายใบ)
void drawPoll() {
  voteModalOpen = false;
  tft.fillScreen(C_BG);

  // Minimal back button
  BTN_BACK = { 12, 12, 40, 40 };
  tft.setTextColor(C_TEXT, C_BG);
  drawTextAuto("<", BTN_BACK.x + 20, BTN_BACK.y + 20, 4, MC_DATUM);

  // Simple header
  drawTextAuto("Polls", tft.width() / 2, 30, 4, MC_DATUM);

  // Minimal join button
  BTN_JOIN_POLL = { (int16_t)(tft.width() / 2 - 100), (int16_t)(tft.height() - 60), 200, 40 };
  drawButton(BTN_JOIN_POLL, "เข้าร่วมโหวต", C_BTN, C_BTN_TEXT, 2);

  // Clean list layout
  int listTop = 70;
  int listBottom = BTN_JOIN_POLL.y - 14;
  int cardX = 20;
  int cardW = tft.width() - 40;
  int cardH = 50;
  int gap = 8;

  int availH = listBottom - listTop;
  int perPage = (availH + gap) / (cardH + gap);
  if (perPage < 1) perPage = 1;

  // Minimal scroll buttons
  BTN_UP = { (int16_t)(tft.width() - 36), (int16_t)(listTop), 28, 24 };
  BTN_DN = { (int16_t)(tft.width() - 36), (int16_t)(listTop + 30), 28, 24 };

  if (showCount > perPage) {
    uint16_t upFill = (showScroll > 0) ? C_TEXT : C_MUTED;
    tft.fillRoundRect(BTN_UP.x, BTN_UP.y, BTN_UP.w, BTN_UP.h, 4, upFill);
    tft.setTextColor(C_BG, upFill);
    tft.drawString("↑", BTN_UP.x + BTN_UP.w / 2, BTN_UP.y + 4, 2);

    uint16_t dnFill = (showScroll + perPage < showCount) ? C_TEXT : C_MUTED;
    tft.fillRoundRect(BTN_DN.x, BTN_DN.y, BTN_DN.w, BTN_DN.h, 4, dnFill);
    tft.setTextColor(C_BG, dnFill);
    tft.drawString("↓", BTN_DN.x + BTN_DN.w / 2, BTN_DN.y + 4, 2);
  } else {
    rectReset(BTN_UP);
    rectReset(BTN_DN);
  }

  if (showCount <= 0) {
    tft.setTextColor(C_MUTED, C_BG);
    drawTextAuto("ไม่พบรายการ", tft.width() / 2, listTop + 40, 2, MC_DATUM);
    return;
  }

  int start = showScroll;
  int end = start + perPage;
  if (end > showCount) end = showCount;

  for (int i = start; i < end; i++) {
    int idxOnScreen = i - start;
    int cardY = listTop + idxOnScreen * (cardH + gap);

    // Minimal card design with lighter gray highlight for selected
    if (shows[i].id == SHOW_ID) {
      tft.fillRect(cardX, cardY, cardW, cardH, tft.color565(240, 240, 240)); // Lighter gray highlight
    } else {
      tft.drawRoundRect(cardX, cardY, cardW, cardH, 6, C_BORDER); // Just border
    }

    // Title
    tft.setTextColor(C_TEXT, C_BG);
    String tt = fitTextPxAuto(shows[i].title, cardW - 100, 2);
    drawTextAuto(tt, cardX + 8, cardY + 8, 2, TL_DATUM);

    // Status indicator - colored text only
    String st = shows[i].status.length() ? shows[i].status : "pending";
    String statusText = "";
    uint16_t statusColor = C_TEXT;
    
    if (st == "voting" || st == "open" || st == "active") {
      statusText = "VOTING";
      statusColor = C_ST_VOTING;
    }
    else if (st == "closed" || st == "done" || st == "finish") {
      statusText = "CLOSED";
      statusColor = C_ST_CLOSED;
    }
    else {
      statusText = "PENDING";
      statusColor = C_ST_PENDING;
    }
    
    tft.setTextColor(statusColor, C_BG);
    drawTextAuto(statusText, cardX + 8, cardY + 28, 1, TL_DATUM);
  }
}

// ✅✅✅ หน้า Vote: 4 ใบต่อหน้า (แนวนอน) + ปุ่ม < > + ปัดเลื่อนได้
// ✅✅✅ แสดงเพียง label ของ choices
void drawVote() {
  voteModalOpen = false;  // ✅ FIX: redraw หน้า Vote = ปิด modal
  tft.fillScreen(C_BG);
  rectReset(BTN_VIEW);
  rectReset(BTN_DONE);

  rectReset(BTN_VPREV);
  rectReset(BTN_VNEXT);

  // Minimal back button
  BTN_BACK = { 12, 10, 40, 40 };
  tft.fillRoundRect(BTN_BACK.x, BTN_BACK.y, BTN_BACK.w, BTN_BACK.h, 6, C_TEXT);
  tft.setTextColor(C_BG, C_TEXT);
  drawTextAuto("<", BTN_BACK.x + 20, BTN_BACK.y + 20, 4, MC_DATUM);

  // Simple header
  int headX = BTN_BACK.x + BTN_BACK.w + 10;
  int headY = 14;

  String topTitle = selectedShowTitle.length()
                      ? selectedShowTitle
                      : (roundTitle.length() ? roundTitle : "Vote");

  tft.setTextColor(C_TEXT, C_BG);
  drawTextAuto(fitTextPxAuto(topTitle, tft.width() - headX - 10, 4), headX, headY, 4, TL_DATUM);

  // Status indicator
  String desc = pollOpen ? ("Voting Open (" + String(choiceCount) + ")") : "Poll Closed";
  tft.setTextColor(C_MUTED, C_BG);
  drawTextAuto(fitTextPxAuto(desc, tft.width() - headX - 10, 2), headX, headY + 30, 2, TL_DATUM);

  if (choiceCount <= 0) {
    tft.setTextColor(C_MUTED, C_BG);
    drawTextAuto("ไม่มีตัวเลือก", tft.width() / 2, 180, 2, MC_DATUM);
    return;
  }

  const int PER_PAGE = 4;
  if (choiceCount <= PER_PAGE) voteScroll = 0;
  int maxStart = ((choiceCount - 1) / PER_PAGE) * PER_PAGE;
  if (voteScroll > maxStart) voteScroll = maxStart;
  if (voteScroll < 0) voteScroll = 0;

  int visible = choiceCount - voteScroll;
  if (visible > PER_PAGE) visible = PER_PAGE;

  // Clean layout
  int cardsTop = 80;
  int padX = 16;
  int gap = 8;

  int cardH = tft.height() - cardsTop - 50;
  if (cardH < 140) cardH = 140;

  int rowW = tft.width() - padX * 2;
  int cardW = (rowW - gap * (visible - 1)) / visible;
  if (cardW < 80) cardW = 80;

  int drawRowW = visible * cardW + gap * (visible - 1);
  int startX = (tft.width() - drawRowW) / 2;

  int vbH = 26;

  for (int cell = 0; cell < visible; cell++) {
    int idx = voteScroll + cell;
    int x = startX + cell * (cardW + gap);
    int y = cardsTop;

    // Minimal card - just border
    tft.drawRoundRect(x, y, cardW, cardH, 8, C_BORDER);

    // Label only - no image
    tft.setTextColor(C_TEXT, C_BG);
    drawTextAuto(fitTextPxAuto(choices[idx].label, cardW - 8, 2),
                 x + cardW / 2,
                 y + cardH / 2,
                 2, MC_DATUM);

    // Minimal vote button
    UIRect vb = { (int16_t)(x + 8), (int16_t)(y + cardH - vbH - 8), (int16_t)(cardW - 16), (int16_t)vbH };
    drawButton(vb, "โหวต", C_BTN, C_BTN_TEXT, 2);
  }

  // Minimal navigation
  if (choiceCount > PER_PAGE) {
    int pages = (choiceCount + (PER_PAGE - 1)) / PER_PAGE;
    int page = (voteScroll / PER_PAGE) + 1;

    BTN_VPREV = { 12, (int16_t)(tft.height() - 40), 36, 30 };
    BTN_VNEXT = { (int16_t)(tft.width() - 48), (int16_t)(tft.height() - 40), 36, 30 };

    uint16_t prevFill = (voteScroll > 0) ? C_TEXT : C_MUTED;
    uint16_t nextFill = (voteScroll < maxStart) ? C_TEXT : C_MUTED;

    tft.fillRoundRect(BTN_VPREV.x, BTN_VPREV.y, BTN_VPREV.w, BTN_VPREV.h, 6, prevFill);
    tft.setTextColor(C_BG, prevFill);
    drawTextAuto("←", BTN_VPREV.x + BTN_VPREV.w / 2, BTN_VPREV.y + BTN_VPREV.h / 2, 4, MC_DATUM);

    tft.fillRoundRect(BTN_VNEXT.x, BTN_VNEXT.y, BTN_VNEXT.w, BTN_VNEXT.h, 6, nextFill);
    tft.setTextColor(C_BG, nextFill);
    drawTextAuto("→", BTN_VNEXT.x + BTN_VNEXT.w / 2, BTN_VNEXT.y + BTN_VNEXT.h / 2, 4, MC_DATUM);

    tft.setTextColor(C_MUTED, C_BG);
    drawTextAuto(String(page) + "/" + String(pages), tft.width() / 2, tft.height() - 25, 2, MC_DATUM);
  }
}

void drawResult() {
  voteModalOpen = false;
  tft.fillScreen(C_BG);
  tft.setTextColor(C_TEXT, C_BG);
  drawTextAuto("VOTENEXT", 30, 18, 2, TL_DATUM);

  BTN_HOME = { (int16_t)(tft.width() - 120), (int16_t)(tft.height() - 58), 100, 42 };
  drawButton(BTN_HOME, "Home", C_BTN, C_BTN_TEXT, 2);

  requestResults();
}

void goScreen(UiScreen s) {
  voteModalOpen = false;  // ✅ FIX
  ui = s;
  if (!screenOn) return;

  switch (ui) {
    case SCR_SPLASH: drawSplash(); break;
    case SCR_STATUS: drawStatus(); break;
    case SCR_POLL: drawPoll(); break;
    case SCR_VOTE: drawVote(); break;
    case SCR_RESULT: drawResult(); break;
  }
}

void showVoteModal() {
  voteModalOpen = true;  // ✅ FIX
  tft.fillRect(0, 0, tft.width(), tft.height(), TFT_BLACK);

  UIRect modal = { (int16_t)(tft.width() / 2 - 120), (int16_t)(tft.height() / 2 - 80), 240, 160 };
  
  // Minimal modal - white on black
  tft.fillRoundRect(modal.x, modal.y, modal.w, modal.h, 12, TFT_WHITE);
  tft.drawRoundRect(modal.x, modal.y, modal.w, modal.h, 12, C_TEXT);

  tft.setTextColor(C_TEXT, TFT_WHITE);
  drawTextAuto("โหวตสำเร็จ", modal.x + modal.w / 2, modal.y + 40, 4, MC_DATUM);
  drawTextAuto("+ 1 โหวต", modal.x + modal.w / 2, modal.y + 80, 2, MC_DATUM);

  BTN_VIEW = { (int16_t)(modal.x + 20), (int16_t)(modal.y + 100), (int16_t)(modal.w - 40), 30 };
  drawButton(BTN_VIEW, "ดูผลโหวต", C_BTN, C_BTN_TEXT, 2);

  BTN_DONE = { (int16_t)(tft.width() - 100), (int16_t)(tft.height() - 50), 80, 36 };
  drawButton(BTN_DONE, "เสร็จ", C_BTN, C_BTN_TEXT, 2);
}

void sendVote(int idx) {
  if (!screenOn || !pollOpen || idx < 0 || idx >= choiceCount) {
    Serial.printf("[VOTE] Invalid vote attempt - screenOn:%d pollOpen:%d idx:%d choiceCount:%d\n", 
                  screenOn, pollOpen, idx, choiceCount);
    return;
  }

  HTTPClient http;
  String url = String("http://") + SERVER_HOST + ":" + String(SERVER_PORT) + "/api/device/vote";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId();
  doc["showId"] = SHOW_ID;
  doc["roundId"] = roundId;
  doc["contestantId"] = choices[idx].id;

  String body;
  serializeJson(doc, body);

  Serial.printf("[VOTE] Sending vote for contestant: %s\n", choices[idx].id.c_str());
  Serial.printf("[VOTE] Vote payload: %s\n", body.c_str());

  int code = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.printf("[VOTE] Response code: %d\n", code);
  Serial.printf("[VOTE] Response body: %s\n", response.c_str());

  if (code == 200) {
    Serial.println("[VOTE] Vote successful");
    ledVoteFlash();
    delay(120);
    ledConnecting();
    showVoteModal();
  } else if (code == 409) {
    Serial.println("[VOTE] Duplicate vote rejected");
    toast("โหวตซ้ำไม่ได้ (โหวตแล้ว)");
  } else if (code == 404) {
    Serial.println("[VOTE] No active voting round");
    toast("ยังไม่มีรอบโหวต (voting)");
  } else {
    Serial.printf("[VOTE] Vote failed with code: %d\n", code);
    toast("โหวตไม่สำเร็จ: " + String(code));
  }
}

// ================== TAP HANDLER (แยกจาก drag) ==================
void handleTap(uint16_t x, uint16_t y) {
  if (ui == SCR_STATUS) {
    if (hit(BTN_JOIN, x, y)) {
      if (WiFi.status() != WL_CONNECTED) {
        toast("WiFi ยังไม่พร้อม");
        return;
      }
      fetchShowsHTTP();
      goScreen(SCR_POLL);
      return;
    }
  }

  if (ui == SCR_POLL) {
    if (hit(BTN_BACK, x, y)) {
      goScreen(SCR_STATUS);
      return;
    }

    if (hit(BTN_UP, x, y) && showScroll > 0) {
      showScroll--;
      drawPoll();
      return;
    }

    int listTop = 70;
    int joinY = tft.height() - 70;
    int listBottom = joinY - 14;
    int cardH = 62, gap = 12;
    int availH = listBottom - listTop;
    int perPage = (availH + gap) / (cardH + gap);
    if (perPage < 1) perPage = 1;

    if (hit(BTN_DN, x, y) && (showScroll + perPage < showCount)) {
      showScroll++;
      drawPoll();
      return;
    }

    int cardX = 40;
    int cardW = tft.width() - 80;

    int start = showScroll;
    int end = start + perPage;
    if (end > showCount) end = showCount;

    for (int i = start; i < end; i++) {
      int idxOnScreen = i - start;
      int cardY = listTop + idxOnScreen * (cardH + gap);
      UIRect card = { (int16_t)cardX, (int16_t)cardY, (int16_t)cardW, (int16_t)cardH };
      if (hit(card, x, y)) {
        SHOW_ID = shows[i].id;
        selectedShowTitle = shows[i].title;

        prefs.begin("vote_next", false);
        prefs.putString("showId", SHOW_ID);
        prefs.end();

        toast("เลือกแล้ว");
        delay(120);
        requestActivePoll();
        drawPoll();
        return;
      }
    }

    if (hit(BTN_JOIN_POLL, x, y)) {
      if (!wsConnected) {
        toast("WS ยังไม่เชื่อม");
        return;
      }
      if (!SHOW_ID.length() || SHOW_ID == DEFAULT_SHOW_ID) {
        toast("ยังไม่ได้เลือก SHOW");
        return;
      }

      requestActivePoll();

      unsigned long t0 = millis();
      while (!pollOpen && millis() - t0 < 1200) {
        ws.loop();
        delay(10);
      }

      if (!pollOpen) {
        toast("ยังไม่มีโพลเปิด");
        return;
      }

      voteScroll = 0;
      goScreen(SCR_VOTE);
      return;
    }
  }

  if (ui == SCR_VOTE) {
    if (hit(BTN_BACK, x, y)) {
      goScreen(SCR_POLL);
      return;
    }

    // ✅ FIX: modal เปิดอยู่ -> รับแค่ปุ่มใน modal กันแตะทะลุ
    if (voteModalOpen) {
      if (hit(BTN_VIEW, x, y)) {
        voteModalOpen = false;
        goScreen(SCR_RESULT);
        return;
      }
      if (hit(BTN_DONE, x, y)) {
        voteModalOpen = false;
        goScreen(SCR_STATUS);
        return;
      }
      return;
    }

    int total = (pollOpen ? choiceCount : 0);
    if (!pollOpen || total <= 0) {
      toast("ยังไม่มีโพลเปิด");
      return;
    }

    const int PER_PAGE = 4;
    int maxStart = ((total - 1) / PER_PAGE) * PER_PAGE;

    if (total > PER_PAGE) {
      if (hit(BTN_VPREV, x, y) && voteScroll > 0) {
        voteScroll -= PER_PAGE;
        if (voteScroll < 0) voteScroll = 0;
        drawVote();
        return;
      }
      if (hit(BTN_VNEXT, x, y) && voteScroll < maxStart) {
        voteScroll += PER_PAGE;
        if (voteScroll > maxStart) voteScroll = maxStart;
        drawVote();
        return;
      }
    }

    int visible = total - voteScroll;
    if (visible > PER_PAGE) visible = PER_PAGE;

    int cardsTop = 96;
    int padX = 18;
    int gap = 12;

    int cardH = tft.height() - cardsTop - 56;
    if (cardH < 150) cardH = 150;

    int rowW = tft.width() - padX * 2;
    int cardW = (rowW - gap * (visible - 1)) / visible;
    if (cardW < 90) cardW = 90;

    int drawRowW = visible * cardW + gap * (visible - 1);
    int startX = (tft.width() - drawRowW) / 2;

    int vbH = 28;

    for (int cell = 0; cell < visible; cell++) {
      int idx = voteScroll + cell;
      int cx = startX + cell * (cardW + gap);
      int cy = cardsTop;

      UIRect vb = { (int16_t)(cx + 10), (int16_t)(cy + cardH - vbH - 12), (int16_t)(cardW - 20), (int16_t)vbH };
      if (hit(vb, x, y)) {
        sendVote(idx);
        return;
      }
    }
  }

  if (ui == SCR_RESULT) {
    if (hit(BTN_HOME, x, y)) {
      goScreen(SCR_STATUS);
      return;
    }
  }
}

// ================== TOUCH HANDLING (รองรับ drag เพื่อ scroll) ==================
void handleTouch() {
  uint16_t x, y;
  bool down = tft.getTouch(&x, &y);

  if (down) {
    lastTouchX = x;
    lastTouchY = y;

    if (!touchDown) {
      touchDown = true;
      touchStartX = x;
      touchStartY = y;
      didDrag = false;
      touchStartMs = millis();
      return;
    }

    int dy = (int)lastTouchY - (int)touchStartY;
    int dx = (int)lastTouchX - (int)touchStartX;

    if (!didDrag && (abs(dy) > 28 || abs(dx) > 28)) {
      didDrag = true;

      if (ui == SCR_POLL && showCount > 0) {
        int listTop = 70;
        int joinY = tft.height() - 70;
        int listBottom = joinY - 14;
        int cardH = 62, gap = 12;
        int availH = listBottom - listTop;
        int perPage = (availH + gap) / (cardH + gap);
        if (perPage < 1) perPage = 1;

        if (dy < 0) {
          if (showScroll + perPage < showCount) showScroll++;
        } else {
          if (showScroll > 0) showScroll--;
        }
        drawPoll();
        return;
      }

      int total = (pollOpen ? choiceCount : 0);
      const int PER_PAGE = 4;

      if (ui == SCR_VOTE && total > PER_PAGE) {
        int adx = abs(dx);
        int ady = abs(dy);

        bool nextPage = false;
        bool prevPage = false;

        if (adx > 28 && adx > ady) {
          if (dx < 0) nextPage = true;  // ปัดซ้าย
          else prevPage = true;         // ปัดขวา
        } else {
          if (dy < 0) nextPage = true;
          else prevPage = true;
        }

        int maxStart = ((total - 1) / PER_PAGE) * PER_PAGE;

        if (nextPage) {
          voteScroll += PER_PAGE;
          if (voteScroll > maxStart) voteScroll = maxStart;
        }
        if (prevPage) {
          voteScroll -= PER_PAGE;
          if (voteScroll < 0) voteScroll = 0;
        }

        drawVote();
        return;
      }
    }
    return;
  }

  if (touchDown) {
    touchDown = false;
    if (!didDrag) {
      if (millis() - touchStartMs < 600) {
        handleTap(touchStartX, touchStartY);
      }
    }
    didDrag = false;
  }
}

// ================== WS handler ==================
void wsEvent(WStype_t type, uint8_t* payload, size_t length) {
  if (!screenOn) return;

  switch (type) {
    case WStype_CONNECTED:
      wsConnected = true;
      Serial.println("[WS] Connected to server");
      ledConnecting();
      requestActivePoll();
      statusDirty = true;
      break;

    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("[WS] Disconnected from server");
      ledDisconnected();
      statusDirty = true;
      break;

    case WStype_TEXT:
      {
        Serial.printf("[WS] Received message length: %u\n", (unsigned)length);

        String s((char*)payload, length);
        Serial.printf("[WS] Raw message: %s\n", s.c_str());

        DynamicJsonDocument doc(24576);
        DeserializationError err = deserializeJson(doc, s);
        if (err) {
          Serial.printf("[WS] JSON parse error: %s\n", err.c_str());
          Serial.printf("[WS] JSON error code: %s\n", err == DeserializationError::NoMemory ? "NoMemory" : 
                      err == DeserializationError::InvalidInput ? "InvalidInput" : 
                      err == DeserializationError::IncompleteInput ? "IncompleteInput" : "Other");
          toast("WS JSON ใหญ่/พัง");
          return;
        }

        Serial.printf("[WS] JSON parsed successfully, document size: %u bytes\n", doc.memoryUsage());
        
        String t = String(doc["type"] | "");
        Serial.printf("[WS] Message type: %s\n", t.c_str());

        if (t == "active") {
          JsonVariantConst p = doc["payload"];
          
          if (p.isNull()) {
            Serial.println("[WS] Payload is null");
          } else {
            Serial.printf("[WS] Payload type: %s\n", p.is<JsonObject>() ? "Object" : "Other");
            Serial.printf("[WS] Payload memory usage: %u bytes\n", p.memoryUsage());
            
            if (p.is<JsonObject>()) {
              JsonObjectConst obj = p.as<JsonObjectConst>();
              Serial.printf("[WS] Payload object has %d members\n", obj.size());
            }
          }

          if (p.isNull()) {
            Serial.println("[WS] Received null payload - closing poll");
            pollOpen = false;
            choiceCount = 0;
            voteScroll = 0;
            roundTitle = "";
            roundId = "";
          } else {
            Serial.println("[WS] Received active poll data");
            pollOpen = true;

            roundTitle = pickStr(p, "title", "roundTitle", nullptr, nullptr, nullptr, "");
            roundId = pickStr(p, "roundId", "round_id", "id", nullptr, nullptr, "");

            Serial.printf("[WS] Round: %s (ID: %s)\n", roundTitle.c_str(), roundId.c_str());

            choiceCount = 0;
            voteScroll = 0;

            JsonArrayConst arr;
            
            // Try multiple approaches to find the choices array
            bool foundArray = false;
            
            // Method 1: Direct access with type checking
            if (doc["payload"]["choices"].is<JsonArray>()) {
              arr = doc["payload"]["choices"].as<JsonArrayConst>();
              foundArray = true;
              Serial.println("[WS] Method 1: Found 'choices' array via direct access");
            } else if (doc["payload"]["contestants"].is<JsonArray>()) {
              arr = doc["payload"]["contestants"].as<JsonArrayConst>();
              foundArray = true;
              Serial.println("[WS] Method 1: Found 'contestants' array via direct access");
            } else if (doc["payload"]["options"].is<JsonArray>()) {
              arr = doc["payload"]["options"].as<JsonArrayConst>();
              foundArray = true;
              Serial.println("[WS] Method 1: Found 'options' array via direct access");
            }
            
            // Method 2: Fallback - try to access without type checking
            if (!foundArray) {
              JsonVariantConst choicesVar = doc["payload"]["choices"];
              if (!choicesVar.isNull()) {
                Serial.println("[WS] Method 2: Trying fallback access to 'choices'");
                // Force conversion to array
                arr = choicesVar.as<JsonArrayConst>();
                if (arr.size() > 0) {
                  foundArray = true;
                  Serial.println("[WS] Method 2: Successfully converted 'choices' to array");
                }
              }
            }
            
            if (!foundArray) {
              Serial.println("[WS] No choices array found with any method");
              // Debug: print raw payload structure
              Serial.println("[WS] Raw payload structure:");
              serializeJsonPretty(doc["payload"], Serial);
              Serial.println();
            }

            Serial.printf("[WS] Found %d choices in poll\n", arr.size());

            for (JsonVariantConst c : arr) {
              if (choiceCount >= MAX_CHOICES) break;
              JsonVariantConst o = c;

              String id = pickStr(o, "id", "contestantId", "uuid", "key", nullptr, "");
              if (!id.length()) continue;

              String label = pickStr(o, "label", "name", "title", "number", "no", id.c_str());
              String img = pickStr(o, "imageUrl", "imgUrl", "image", "photoUrl", "photo", "");

              choices[choiceCount].id = id;
              choices[choiceCount].label = label;
              choices[choiceCount].imgUrl = img;
              choices[choiceCount].imgPath = "/c_" + id + ".jpg";
              choices[choiceCount].imgReady = false;

              Serial.printf("[WS] Choice %d: %s (%s)\n", choiceCount + 1, label.c_str(), id.c_str());

              choiceCount++;
            }
          }

          Serial.printf("[WS] Processed active poll - roundId=%s choices=%d\n", roundId.c_str(), choiceCount);

          needImagePreload = true;
          imgDlIndex = 0;
        }

        if (t == "poll_open") {
          JsonVariantConst p = doc["payload"];
          String sid = pickStr(p, "showId", "show_id", nullptr, nullptr, nullptr, "");
          if (!p.isNull() && sid == SHOW_ID) {
            Serial.println("[WS] Poll opened for current show");
            pollOpen = true;
            roundTitle = pickStr(p, "title", "roundTitle", nullptr, nullptr, nullptr, "");
            roundId = pickStr(p, "roundId", "round_id", "id", nullptr, nullptr, "");
            Serial.printf("[WS] Poll opened - Round: %s (ID: %s)\n", roundTitle.c_str(), roundId.c_str());
          }
          if (ui == SCR_STATUS) statusDirty = true;
        }

        if (t == "poll_close") {
          JsonVariantConst p = doc["payload"];
          String sid = pickStr(p, "showId", "show_id", nullptr, nullptr, nullptr, "");
          if (!p.isNull() && sid == SHOW_ID) {
            Serial.println("[WS] Poll closed for current show");
            pollOpen = false;
            choiceCount = 0;
            voteScroll = 0;
            roundTitle = "";
            roundId = "";
          }
          if (ui == SCR_STATUS) statusDirty = true;
          if (ui == SCR_VOTE) goScreen(SCR_STATUS);
        }

        if (ui == SCR_STATUS) statusDirty = true;
        if (ui == SCR_VOTE && t == "active") drawVote();

      }  // ปิด block ของ case WStype_TEXT
      break;

    default: 
      Serial.printf("[WS] Unhandled event type: %d\n", type);
      break;
  }  // ปิด switch
}  // ปิดฟังก์ชัน wsEvent


// ================== POWER ==================
void setScreenPower(bool on) {
  screenOn = on;
  if (!on) {
    voteModalOpen = false;
    ledOff();
    tftSleep(true);
    setBacklightHW(false);
    ws.disconnect();
    wsConnected = false;
    tft.fillScreen(TFT_BLACK);
  } else {
    setBacklightHW(true);
    tftSleep(false);
    ledConnecting();
    reconnectWs();
    goScreen(SCR_STATUS);
  }
}

// ================== SETUP / LOOP ==================
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== VoteNext TFT Arduino Starting ===");
  Serial.printf("[INIT] Firmware compiled: %s %s\n", __DATE__, __TIME__);
  Serial.printf("[INIT] Device ID: %s\n", deviceId().c_str());
  Serial.printf("[INIT] Server: %s:%d\n", SERVER_HOST, SERVER_PORT);
  Serial.printf("[INIT] WiFi SSID: %s\n", WIFI_SSID);

  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  ledOff();

  pinMode(PIN_PWR_BTN, INPUT_PULLUP);
  ledBoot();

  Serial.println("[INIT] Initializing TFT...");
  tft.init();
  tft.setRotation(TFT_ROTATION);
  tft.setSwapBytes(true);
  Serial.printf("[INIT] TFT initialized - Size: %dx%d, Rotation: %d\n", tft.width(), tft.height(), TFT_ROTATION);

  uiInitTheme();
  setBacklightHW(true);
  Serial.println("[INIT] UI theme initialized, backlight ON");

  Serial.println("[INIT] Initializing LittleFS...");
  littlefsReady = LittleFS.begin(true);
  if (littlefsReady && LittleFS.exists(THAI_FONT_FILE)) {
    tft.loadFont(THAI_FONT_NAME, LittleFS);
    thaiFontReady = true;
    Serial.println("[INIT] Thai font loaded successfully");
  } else {
    thaiFontReady = false;
    Serial.println("[INIT] Thai font NOT found - put data/THSarabunNew24.vlw and Upload LittleFS");
  }

  if (digitalRead(PIN_PWR_BTN) == LOW) {
    delay(700);
    if (digitalRead(PIN_PWR_BTN) == LOW) {
      clearTouchCal();
      Serial.println("[INIT] Touch calibration cleared");
    }
  }

  uint16_t cal[5];
  if (!loadTouchCal(cal, TFT_ROTATION)) {
    Serial.println("[INIT] No touch calibration found - starting calibration...");
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    drawTextAuto("Touch corners to calibrate", tft.width() / 2, tft.height() / 2, 2, MC_DATUM);
    delay(900);

    tft.calibrateTouch(cal, TFT_MAGENTA, TFT_BLACK, 15);
    saveTouchCal(cal, TFT_ROTATION);

    tft.fillScreen(TFT_BLACK);
    drawTextAuto("Saved!", tft.width() / 2, tft.height() / 2, 2, MC_DATUM);
    delay(500);
    Serial.println("[INIT] Touch calibration completed and saved");
  } else {
    Serial.println("[INIT] Touch calibration loaded from memory");
  }
  tft.setTouch(cal);

  prefs.begin("vote_next", true);
  SHOW_ID = prefs.getString("showId", "");
  prefs.end();
  if (!SHOW_ID.length()) {
    SHOW_ID = DEFAULT_SHOW_ID;
    Serial.printf("[INIT] No saved show ID, using default: %s\n", SHOW_ID.c_str());
  } else {
    Serial.printf("[INIT] Loaded saved show ID: %s\n", SHOW_ID.c_str());
  }

  goScreen(SCR_SPLASH);
  delay(700);

  Serial.println("[INIT] Connecting to WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WIFI] Connected successfully! IP: %s\n", WiFi.localIP().toString().c_str());
    ledConnecting();
  } else {
    Serial.printf("[WIFI] Connection failed! Status: %d\n", WiFi.status());
    ledDisconnected();
  }

  Serial.println("[INIT] Connecting to WebSocket...");
  reconnectWs();
  goScreen(SCR_STATUS);
  
  Serial.println("=== VoteNext TFT Arduino Ready ===");
}

void loop() {
  if (screenOn) {
    ws.loop();
    handleTouch();

    preloadChoiceImagesTick();

    if (statusDirty && ui == SCR_STATUS && millis() > toastHoldUntil) {
      statusDirty = false;
      drawStatus();
    }
  }

  static int lastBtn = HIGH;
  static unsigned long lastDeb = 0;
  int now = digitalRead(PIN_PWR_BTN);
  if (now != lastBtn && millis() - lastDeb > 30) {
    lastDeb = millis();
    lastBtn = now;
    if (now == LOW) {
      Serial.printf("[POWER] Button pressed - toggling screen (current: %s)\n", screenOn ? "ON" : "OFF");
      setScreenPower(!screenOn);
    }
  }

  // WiFi connection monitoring
  static unsigned long lastWifiCheck = 0;
  if (millis() - lastWifiCheck > 10000) { // Check every 10 seconds
    lastWifiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.printf("[WIFI] Connection lost! Status: %d\n", WiFi.status());
      ledDisconnected();
    } else if (!wsConnected) {
      Serial.println("[WIFI] OK but WebSocket disconnected - attempting reconnect");
      reconnectWs();
    }
  }
}

// ================== JPEG functions ==================
static void drawArrayJpegCentered(const uint8_t arrayname[], uint32_t array_size) {
  JpegDec.decodeArray(arrayname, array_size);
  int x = (tft.width() - (int)JpegDec.width) / 2;
  int y = (tft.height() - (int)JpegDec.height) / 2;
  renderJPEG(x, y);
}

static void renderJPEG(int xpos, int ypos) {
  uint16_t w = JpegDec.width;
  uint16_t h = JpegDec.height;

  int16_t x = xpos;
  int16_t y = ypos;
  int16_t max_x = tft.width();
  int16_t max_y = tft.height();

  tft.startWrite();

  while (JpegDec.read()) {
    int16_t mcu_x = JpegDec.MCUx * JpegDec.MCUWidth + x;
    int16_t mcu_y = JpegDec.MCUy * JpegDec.MCUHeight + y;

    uint16_t mcu_w = JpegDec.MCUWidth;
    uint16_t mcu_h = JpegDec.MCUHeight;

    if (mcu_x + mcu_w > x + w) mcu_w = (x + w) - mcu_x;
    if (mcu_y + mcu_h > y + h) mcu_h = (y + h) - mcu_y;

    if (mcu_x >= max_x || mcu_y >= max_y) continue;
    if (mcu_x + mcu_w <= 0 || mcu_y + mcu_h <= 0) continue;

    if (mcu_x + mcu_w > max_x) mcu_w = max_x - mcu_x;
    if (mcu_y + mcu_h > max_y) mcu_h = max_y - mcu_y;
    if (mcu_x < 0) {
      mcu_w += mcu_x;
      mcu_x = 0;
    }
    if (mcu_y < 0) {
      mcu_h += mcu_y;
      mcu_y = 0;
    }

    tft.pushImage(mcu_x, mcu_y, mcu_w, mcu_h, (uint16_t*)JpegDec.pImage);
  }

  tft.endWrite();
}

static inline int16_t iMin(int16_t a, int16_t b) {
  return (a < b) ? a : b;
}
static inline int16_t iMax(int16_t a, int16_t b) {
  return (a > b) ? a : b;
}

static void renderJPEGClip(int16_t xpos, int16_t ypos,
                           int16_t clipX, int16_t clipY, int16_t clipW, int16_t clipH) {
  uint16_t w = JpegDec.width;
  uint16_t h = JpegDec.height;

  int16_t max_x = tft.width();
  int16_t max_y = tft.height();

  int16_t clipR = clipX + clipW;
  int16_t clipB = clipY + clipH;

  static uint16_t blockBuf[16 * 16];

  tft.startWrite();

  while (JpegDec.read()) {
    int16_t mcu_x = JpegDec.MCUx * JpegDec.MCUWidth + xpos;
    int16_t mcu_y = JpegDec.MCUy * JpegDec.MCUHeight + ypos;

    int16_t mcu_w = JpegDec.MCUWidth;
    int16_t mcu_h = JpegDec.MCUHeight;

    if (mcu_x + mcu_w > (int16_t)(xpos + w)) mcu_w = (xpos + w) - mcu_x;
    if (mcu_y + mcu_h > (int16_t)(ypos + h)) mcu_h = (ypos + h) - mcu_y;

    if (mcu_x >= max_x || mcu_y >= max_y) continue;
    if (mcu_x + mcu_w <= 0 || mcu_y + mcu_h <= 0) continue;

    if (mcu_x + mcu_w > max_x) mcu_w = max_x - mcu_x;
    if (mcu_y + mcu_h > max_y) mcu_h = max_y - mcu_y;
    if (mcu_x < 0) {
      mcu_w += mcu_x;
      mcu_x = 0;
    }
    if (mcu_y < 0) {
      mcu_h += mcu_y;
      mcu_y = 0;
    }

    int16_t ix0 = iMax(mcu_x, clipX);
    int16_t iy0 = iMax(mcu_y, clipY);
    int16_t ix1 = iMin((int16_t)(mcu_x + mcu_w), clipR);
    int16_t iy1 = iMin((int16_t)(mcu_y + mcu_h), clipB);

    int16_t iw = ix1 - ix0;
    int16_t ih = iy1 - iy0;
    if (iw <= 0 || ih <= 0) continue;

    uint16_t* src = (uint16_t*)JpegDec.pImage;
    int16_t srcStride = JpegDec.MCUWidth;

    if (ix0 == mcu_x && iy0 == mcu_y && iw == mcu_w && ih == mcu_h) {
      tft.pushImage(mcu_x, mcu_y, mcu_w, mcu_h, src);
    } else {
      int16_t offX = ix0 - mcu_x;
      int16_t offY = iy0 - mcu_y;

      for (int yy = 0; yy < ih; yy++) {
        memcpy(&blockBuf[yy * iw],
               &src[(offY + yy) * srcStride + offX],
               iw * sizeof(uint16_t));
      }
      tft.pushImage(ix0, iy0, iw, ih, blockBuf);
    }
  }

  tft.endWrite();
}

static bool drawJpegFromFSInBox(const String& path, int boxX, int boxY, int boxW, int boxH) {
  if (!littlefsReady) return false;
  if (!LittleFS.exists(path)) return false;

  JpegDec.decodeFsFile(path.c_str());

  int16_t drawX = boxX + (boxW - (int16_t)JpegDec.width) / 2;
  int16_t drawY = boxY + (boxH - (int16_t)JpegDec.height) / 2;

  renderJPEGClip(drawX, drawY, boxX, boxY, boxW, boxH);
  return true;
}
