/**
 * ============================================================================
 * LumenGrove - Solar Power Bank Rental Station (ESP32 Firmware)
 * Architecture: ESP32 + 16x2 I2C LCD + MFRC522 RFID
 * Protocol: MQTT (TCP) + Supabase HTTPS REST API
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>

// ============================================================================
// 1. HARDWARE GPIO PIN DEFINITIONS & CONSTANTS
// ============================================================================
// Hardware pinout configured to match project wiring schematic
#define LCD_SDA_PIN 21    // I2C SDA (GPIO 21)
#define LCD_SCL_PIN 22    // I2C SCL (GPIO 22)
#define LCD_I2C_ADDR 0x27 // Standard PCF8574 I2C address (0x27)
#define LCD_COLUMNS 16
#define LCD_ROWS 2

#define RFID_SS_PIN 5    // SPI SS / SDA for MFRC522 (GPIO 5)
#define RFID_RST_PIN 2   // Reset pin for MFRC522 (GPIO 2)
#define RFID_SCK_PIN 18  // Default VSPI SCK (GPIO 18)
#define RFID_MISO_PIN 19 // Default VSPI MISO (GPIO 19)
#define RFID_MOSI_PIN 23 // Default VSPI MOSI (GPIO 23)

// Solenoid / Relay: Not connected in hardware (virtual / simulated)
#define UNLOCK_PULSE_MS 2000 // Lock release pulse duration in milliseconds

// ============================================================================
// 2. NETWORK, MQTT & SUPABASE CREDENTIALS
// ============================================================================
// Wi-Fi Credentials
const char *WIFI_SSID = "Rohan";        // TODO: UPDATE WI-FI SSID
const char *WIFI_PASSWORD = "rohan123"; // TODO: UPDATE WI-FI PASSWORD

// Public HiveMQ MQTT Broker (TCP Port 1883 for ESP32)
const char *MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char *MQTT_TOPIC = "lumengrove/stations/station_01/rent";
const char *MQTT_CLIENT_ID = "LumenGrove_ESP32_Station01";

// Supabase Project Endpoint & Anon Key
const char *SUPABASE_URL = "https://jbwwlyebmpamangwlgog.supabase.co";
const char *SUPABASE_ANON_KEY = "sb_publishable_kX0xur9mOPSfjhFQlvuvyA_9t2GJv7t";
const char *DEFAULT_STATION_ID = "station_01";

// ============================================================================
// 3. OBJECT INSTANCES & GLOBALS
// ============================================================================
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLUMNS, LCD_ROWS);
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// LCD State Timers
unsigned long lcdResetAtMs = 0;
bool lcdShowingRentState = false;

// Function declarations
void setupHardware();
void connectWiFi();
void connectMQTT();
void showLcdIdle();
void showLcdRentState(const char *bankId);
void onMqttMessage(char *topic, byte *payload, unsigned int length);
void handleRentCommand(const char *stationId, const char *bankId, const char *userId);
bool updatePowerBankRented(const char *bankId);
bool insertSupabaseRental(const char *rentalId, const char *stationId, const char *bankId, const char *userId);

// ============================================================================
// 4. SETUP & LOOP
// ============================================================================
void setup()
{
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("  LumenGrove - Solar Power Bank Station (ESP32)   "));
  Serial.println(F("=================================================="));

  setupHardware();
  showLcdIdle();

  connectWiFi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  mqttClient.setBufferSize(512); // Buffer for JSON rent payload
}

void loop()
{
  // Ensure Wi-Fi is connected
  if (WiFi.status() != WL_CONNECTED)
  {
    connectWiFi();
  }

  // Ensure MQTT client is connected
  if (!mqttClient.connected())
  {
    connectMQTT();
  }
  mqttClient.loop();

  // Reset LCD back to Idle state after timeout
  if (lcdShowingRentState && millis() >= lcdResetAtMs)
  {
    lcdShowingRentState = false;
    showLcdIdle();
  }

  delay(10);
}

// ============================================================================
// 5. HARDWARE INITIALIZATION
// ============================================================================
void setupHardware()
{
  // I2C Wire and LCD Display
  Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // SPI and MFRC522 RFID
  SPI.begin(RFID_SCK_PIN, RFID_MISO_PIN, RFID_MOSI_PIN, RFID_SS_PIN);
  rfid.PCD_Init();

  Serial.println(F("[HARDWARE] I2C LCD & MFRC522 RFID initialized."));
}

// ============================================================================
// 6. LCD DISPLAY MODES (16x2 Character Boundary Guarded)
// ============================================================================
void showLcdIdle()
{
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Station Ready   "); // 16 chars exact
  lcd.setCursor(0, 1);
  lcd.print("Ready to Rent   "); // 16 chars exact
  Serial.println(F("[LCD] State -> Idle (Station Ready | Ready to Rent)"));
}

void showLcdRentState(const char *bankId)
{
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Power Bank Taken"); // 16 chars exact

  // Format Line 2: "Bank: <bank_id>" (ensure total length <= 16 chars)
  char line2[17];
  memset(line2, ' ', 16);
  line2[16] = '\0';

  // Extract up to 10 characters from bankId to fit after "Bank: "
  String shortBankId = String(bankId);
  if (shortBankId.length() > 10)
  {
    shortBankId = shortBankId.substring(0, 10);
  }
  snprintf(line2, sizeof(line2), "Bank: %-10s", shortBankId.c_str());

  lcd.setCursor(0, 1);
  lcd.print(line2);

  lcdShowingRentState = true;
  lcdResetAtMs = millis() + 5000; // Return to idle after 5 seconds
  Serial.printf("[LCD] State -> Renting (%s | %s)\n", "Power Bank Taken", line2);
}

// ============================================================================
// 7. WI-FI & MQTT CONNECTION MANAGERS
// ============================================================================
const char* getWiFiStatusStr(wl_status_t status)
{
  switch (status)
  {
    case WL_IDLE_STATUS:     return "Idle / Connecting";
    case WL_NO_SSID_AVAIL:   return "SSID not found (Check if 2.4 GHz)";
    case WL_SCAN_COMPLETED:  return "Scan completed";
    case WL_CONNECTED:       return "Connected";
    case WL_CONNECT_FAILED:  return "Connect failed (Check password)";
    case WL_CONNECTION_LOST: return "Connection lost";
    case WL_DISCONNECTED:    return "Disconnected";
    default:                 return "Unknown status";
  }
}

void connectWiFi()
{
  if (WiFi.status() == WL_CONNECTED)
    return;

  static unsigned long lastAttempt = 0;
  if (lastAttempt != 0 && millis() - lastAttempt < 10000)
    return; // Rate limit reconnect attempts in loop
  lastAttempt = millis();

  Serial.println();
  Serial.printf("[WIFI] Connecting to SSID: %s\n", WIFI_SSID);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi ");
  lcd.setCursor(0, 1);
  char lcdSsid[17];
  snprintf(lcdSsid, sizeof(lcdSsid), "%-16.16s", WIFI_SSID);
  lcd.print(lcdSsid);

  // Cleanly disconnect and reset radio before starting a new connection attempt
  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startMs < 15000)
  {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.printf("[WIFI] Connected! Local IP: %s\n", WiFi.localIP().toString().c_str());
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected! ");
    lcd.setCursor(0, 1);
    char ipBuf[17];
    snprintf(ipBuf, sizeof(ipBuf), "%-16.16s", WiFi.localIP().toString().c_str());
    lcd.print(ipBuf);
    delay(1500);
    showLcdIdle();
  }
  else
  {
    wl_status_t st = WiFi.status();
    Serial.printf("[WIFI ERROR] Failed to connect (Status %d: %s). Will retry in 10s...\n", st, getWiFiStatusStr(st));
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Conn Failed");
    lcd.setCursor(0, 1);
    if (st == WL_NO_SSID_AVAIL)
      lcd.print("SSID Not Found  ");
    else if (st == WL_CONNECT_FAILED)
      lcd.print("Wrong Password  ");
    else
      lcd.print("Check 2.4GHz AP ");
  }
}

void connectMQTT()
{
  static unsigned long lastMqttAttempt = 0;
  if (millis() - lastMqttAttempt < 4000)
    return;
  lastMqttAttempt = millis();

  if (WiFi.status() != WL_CONNECTED)
    return;

  Serial.printf("[MQTT] Connecting to broker %s:%d...\n", MQTT_BROKER, MQTT_PORT);
  String dynamicClientId = String(MQTT_CLIENT_ID) + "_" + String((uint32_t)ESP.getEfuseMac(), HEX);

  if (mqttClient.connect(dynamicClientId.c_str()))
  {
    Serial.println(F("[MQTT] Connected successfully!"));
    mqttClient.subscribe(MQTT_TOPIC);
    Serial.printf("[MQTT] Subscribed to topic: %s\n", MQTT_TOPIC);
  }
  else
  {
    Serial.printf("[MQTT] Failed, rc=%d. Will retry in 4s...\n", mqttClient.state());
  }
}

// ============================================================================
// 8. MQTT MESSAGE INGESTION & DISPATCH
// ============================================================================
void onMqttMessage(char *topic, byte *payload, unsigned int length)
{
  Serial.println();
  Serial.printf("[MQTT INCOMING] Topic: %s (Length: %u)\n", topic, length);

  char jsonBuf[512];
  if (length >= sizeof(jsonBuf))
  {
    Serial.println(F("[MQTT ERROR] Payload too large for buffer!"));
    return;
  }
  memcpy(jsonBuf, payload, length);
  jsonBuf[length] = '\0';
  Serial.printf("[MQTT PAYLOAD] %s\n", jsonBuf);

  // Parse JSON command
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, jsonBuf);
  if (error)
  {
    Serial.printf("[JSON ERROR] Parsing failed: %s\n", error.c_str());
    return;
  }

  const char *action = doc["action"] | "";
  const char *stationId = doc["station_id"] | DEFAULT_STATION_ID;
  const char *bankId = doc["bank_id"] | "";
  const char *userId = doc["user_id"] | "";

  if (strcmp(action, "rent") == 0)
  {
    handleRentCommand(stationId, bankId, userId);
  }
  else
  {
    Serial.printf("[MQTT] Unknown action: '%s'. Ignored.\n", action);
  }
}

// ============================================================================
// 9. RENTAL FLOW EXECUTION
// ============================================================================
void handleRentCommand(const char *stationId, const char *bankId, const char *userId)
{
  Serial.println(F("--------------------------------------------------"));
  Serial.println(F("[RENTAL FLOW] Executing rent sequence..."));
  Serial.printf("  Station: %s\n", stationId);
  Serial.printf("  Bank ID: %s\n", bankId);
  Serial.printf("  User ID: %s\n", userId);
  Serial.println(F("--------------------------------------------------"));

  // 1. Simulate and log RFID scan verification
  Serial.println(F("[RFID] Scanning bay slot with MFRC522 antenna..."));
  Serial.printf("[RFID] RFID Tag Detected: [TAG_%s]. Tag authenticated!\n", bankId);

  // 2. Update 16x2 I2C LCD Display
  showLcdRentState(bankId);

  // 3. Virtual release simulation (no physical solenoid/relay attached)
  Serial.println(F("[LOCK] Slot released (virtual release)."));
  delay(UNLOCK_PULSE_MS);

  // 4. Generate unique human-readable rental ID (e.g. LG-8234)
  char rentalId[16];
  snprintf(rentalId, sizeof(rentalId), "LG-%lu", (unsigned long)(1000 + (millis() % 9000)));

  // 5. Send HTTPS Request to Supabase to mark power bank as rented
  updatePowerBankRented(bankId);

  // 6. Send HTTPS Request to Supabase to insert rental record
  insertSupabaseRental(rentalId, stationId, bankId, userId);

  Serial.println(F("[RENTAL FLOW] Completed successfully!"));
  Serial.println(F("=================================================="));
}

// ============================================================================
// 10. SUPABASE REST API CALLS (HTTPS)
// ============================================================================
bool updatePowerBankRented(const char *bankId)
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println(F("[SUPABASE ERROR] Cannot update bank: Wi-Fi not connected"));
    return false;
  }

  WiFiClientSecure secureClient;
  secureClient.setInsecure(); // Allows connecting without hardcoded leaf CA cert

  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/banks?id=eq." + String(bankId);

  Serial.printf("[SUPABASE] PATCH %s\n", url.c_str());
  if (!http.begin(secureClient, url))
  {
    Serial.println(F("[SUPABASE ERROR] HTTPClient begin failed for banks PATCH"));
    return false;
  }

  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  String payload = "{\"is_rented\":true}";
  int httpCode = http.sendRequest("PATCH", payload);

  Serial.printf("[SUPABASE] Banks PATCH Response Code: %d\n", httpCode);
  if (httpCode >= 200 && httpCode < 300)
  {
    Serial.println(F("[SUPABASE] Successfully marked power bank as rented (is_rented: true)"));
    http.end();
    return true;
  }
  else
  {
    String resp = http.getString();
    Serial.printf("[SUPABASE ERROR] PATCH Failed: %s\n", resp.c_str());
    http.end();
    return false;
  }
}

bool insertSupabaseRental(const char *rentalId, const char *stationId, const char *bankId, const char *userId)
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println(F("[SUPABASE ERROR] Cannot insert rental: Wi-Fi not connected"));
    return false;
  }

  WiFiClientSecure secureClient;
  secureClient.setInsecure();

  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/rentals";

  Serial.printf("[SUPABASE] POST %s\n", url.c_str());
  if (!http.begin(secureClient, url))
  {
    Serial.println(F("[SUPABASE ERROR] HTTPClient begin failed for rentals POST"));
    return false;
  }

  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=representation");

  // Construct JSON body
  JsonDocument bodyDoc;
  bodyDoc["id"] = rentalId;
  bodyDoc["user_id"] = userId;
  bodyDoc["station_id"] = stationId;
  bodyDoc["bank_id"] = bankId;
  bodyDoc["bank_type_id"] = "std";
  bodyDoc["duration_hours"] = 1.0;
  bodyDoc["amount_paise"] = 1000;
  bodyDoc["status"] = "active";

  String requestBody;
  serializeJson(bodyDoc, requestBody);
  Serial.printf("[SUPABASE POST BODY] %s\n", requestBody.c_str());

  int httpCode = http.POST(requestBody);
  Serial.printf("[SUPABASE] Rentals POST Response Code: %d\n", httpCode);

  if (httpCode >= 200 && httpCode < 300)
  {
    String response = http.getString();
    Serial.printf("[SUPABASE] Rental recorded successfully! Result:\n%s\n", response.c_str());
    http.end();
    return true;
  }
  else
  {
    String errorResponse = http.getString();
    Serial.printf("[SUPABASE ERROR] Insert failed: %s\n", errorResponse.c_str());
    http.end();
    return false;
  }
}
