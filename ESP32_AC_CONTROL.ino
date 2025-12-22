#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <IRremote.h>
#include <Wire.h>  // I2C communication
#include <LiquidCrystal_I2C.h>  // LCD Display library (I2C)

// ==================== CONFIGURATION ====================
const char* ssid = "Talha";
const char* password = "1234567890";

// Railway Configuration
const char* websocket_server = "ackit-iot-production.up.railway.app";
const int websocket_port = 443;  // WSS uses port 443 (HTTPS port)
const char* websocket_path = "/esp32";

const char* serial_number = "AC-919834-359";

// ==================== PINS ====================
#define POWER_PIN           33
#define POSITIVE_TEMP_PIN   26
#define NEGATIVE_TEMP_PIN   25
#define ROOM_TEMP_SENSOR_PIN 23
#define TSOP_PIN             4

// Display configuration (16x2 LCD with I2C)
// I2C pins for ESP32: SDA=21, SCL=22 (default)
// If you don't have display, comment out USE_DISPLAY
#define USE_DISPLAY true  // Set to false if no display connected
#define LCD_I2C_ADDRESS 0x27  // Common I2C address (try 0x3F if 0x27 doesn't work)
#define LCD_COLS 16
#define LCD_ROWS 2

// Pulse timing configuration (for AC remote button simulation)
#define PULSE_PRESS_TIME_MS   200   // How long to hold button pressed (ms) - increased for reliability
#define PULSE_RELEASE_TIME_MS 300   // Time between button presses (ms) - minimum gap between presses

// Hardware configuration - CHANGE THIS IF HARDWARE DOESN'T RESPOND
// Try both options: true = Active HIGH, false = Active LOW
#define HARDWARE_ACTIVE_HIGH false  // false = Active LOW (LOW=ON), true = Active HIGH (HIGH=ON)

// Temperature limits
const int TEMP_MIN = 16;
const int TEMP_MAX = 30;

// ==================== SENSORS / LIBS ====================
#define DHTTYPE DHT11
DHT dht(ROOM_TEMP_SENSOR_PIN, DHTTYPE);
WebSocketsClient webSocket;

// Display (LCD with I2C)
#if USE_DISPLAY
LiquidCrystal_I2C lcd(LCD_I2C_ADDRESS, LCD_COLS, LCD_ROWS);
#endif

// ==================== DEVICE STATE ====================
struct DeviceState {
  bool power = false;
  int temperature = 20;        // displayed/target temperature
  float roomTemperature = 0.0; // from DHT
  bool remote = false;
  bool lockState = false;
  int lockedTemperature = 0;
  bool isConnected = false;
  String deviceKey = "";
  bool isEventActive = false;
  unsigned long lastCommandTime = 0;
  unsigned long lastTempCommandTime = 0;
  int eventTemperature = 0;
} device;

// Timing
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000UL;

// IR handling
unsigned long lastIrSendMillis = 0;
const unsigned long irDebounceMs = 1500UL;

// Room temperature auto-update (every 5 minutes = 300000ms)
unsigned long roomTempTicker = 0;
const unsigned long ROOM_TEMP_INTERVAL_MS = 5UL * 60UL * 1000UL; // 5 minutes

// Forward declarations
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void handleMessage(String message);
void handleIncomingJson(const String &payload);
void handleCommand(JsonObject command);
void handleEventStatus(JsonObject command);
void handleLockState(JsonObject command);
void readAndSendRoomTemp();
void sendDeviceConnected();
void sendPowerUpdate();
void sendTempUpdate();
void sendLockUpdate();
void sendStateUpdate(bool remoteFlag = false);
void sendPulses(int pin, int count);
void startRoomTempAuto();
void stopRoomTempAuto();
void testHardwarePins(); // Hardware test function
void updateDisplay(); // Update LCD display

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n🚀 ESP32 Device Module starting...");

  // Pins initialization
  pinMode(POWER_PIN, OUTPUT);
  pinMode(POSITIVE_TEMP_PIN, OUTPUT);
  pinMode(NEGATIVE_TEMP_PIN, OUTPUT);
  
  // Initialize all pins to idle state based on hardware type
  if (HARDWARE_ACTIVE_HIGH) {
    // Active HIGH: HIGH = ON/active, LOW = OFF/idle
    digitalWrite(POWER_PIN, LOW);  // Start OFF
    digitalWrite(POSITIVE_TEMP_PIN, LOW);  // Start idle
    digitalWrite(NEGATIVE_TEMP_PIN, LOW);  // Start idle
  } else {
    // Active LOW: LOW = ON/active, HIGH = OFF/idle
    digitalWrite(POWER_PIN, HIGH);  // Start OFF
    digitalWrite(POSITIVE_TEMP_PIN, HIGH);  // Start idle
    digitalWrite(NEGATIVE_TEMP_PIN, HIGH);  // Start idle
  }

  // DHT init
  dht.begin();

  // IR init
  IrReceiver.begin(TSOP_PIN, ENABLE_LED_FEEDBACK);

  // Display init
  #if USE_DISPLAY
  Wire.begin();  // Initialize I2C
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("AC Controller");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(1000);
  lcd.clear();
  #endif

  // WiFi connect
  WiFi.begin(ssid, password);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    if (millis() - wifiStart > 20000) {
      wifiStart = millis();
    }
  }

  webSocket.onEvent(webSocketEvent);
  
  // Railway: Use SSL (WSS - secure WebSocket)
  // Note: WebSocketsClient library automatically handles SSL when using beginSSL
  webSocket.beginSSL(websocket_server, websocket_port, websocket_path);
  Serial.printf("🔐 [WS] Connecting to Railway (WSS): wss://%s:%d%s\n", websocket_server, websocket_port, websocket_path);
  
  webSocket.setReconnectInterval(5000);
  
  // Initial display update
  updateDisplay();
  
  // Test hardware pins on startup (optional - comment out if not needed)
  // testHardwarePins();
}

// ==================== LOOP ====================
void loop() {
  webSocket.loop();

  // WiFi reconnect
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > reconnectInterval) {
      lastReconnectAttempt = now;
      Serial.println("WiFi disconnected - attempting reconnect");
      WiFi.begin(ssid, password);
    }
  }

  // IR handling - Physical remote control detection
  // If device is locked: send IR_VIOLATION (physical remote blocked)
  // If device is unlocked: send remote_lock (physical remote used)
  if (IrReceiver.decode()) {
    unsigned long now = millis();
    if (now - lastIrSendMillis > irDebounceMs) {
      lastIrSendMillis = now;
      
      if (device.isConnected) {
        StaticJsonDocument<200> doc;
        
        if (device.lockState) {
          // Device is locked - physical remote is blocked (IR violation)
          doc["type"] = "IR_VIOLATION";
          doc["serial"] = String(serial_number);
          String out;
          serializeJson(doc, out);
          webSocket.sendTXT(out);
          Serial.println("🔒 [IR] Physical remote blocked - Device is locked");
        } else {
          // Device is unlocked - physical remote can be used
          doc["device_id"] = String(serial_number);
          doc["remote_lock"] = true;
          String out;
          serializeJson(doc, out);
          webSocket.sendTXT(out);
        }
      }
    }
    IrReceiver.resume();
  }

  // Periodic room temperature send (every 5 minutes) when device is ON
  if (device.power && device.isConnected && (millis() - roomTempTicker > ROOM_TEMP_INTERVAL_MS)) {
    roomTempTicker = millis();
    readAndSendRoomTemp();
  }
}

// ==================== WEBSOCKET EVENTS ====================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      device.isConnected = false;
      stopRoomTempAuto();
      break;

    case WStype_CONNECTED: {
      Serial.println("✅ WS connected");
      device.isConnected = true;
      updateDisplay();  // Update display on connection
      
      // Send DEVICE_CONNECTED after short delay (matching simulator)
      delay(100);
      sendDeviceConnected();
      
      // Small delay then send room temp if power is on
      delay(200);
      if (device.power) {
        readAndSendRoomTemp();
      }
      
      // Start automatic room temperature updates
      startRoomTempAuto();
      break;
    }

    case WStype_TEXT: {
      String msg = String((char*)payload);
      
      // Skip logging for routine messages (matching simulator)
      // Skip: REQUEST_ROOM_TEMP, ping/pong messages
      bool shouldLog = true;
      if (msg == "ping" || msg == "PING" || msg == "pong" || msg == "PONG") {
        shouldLog = false;
      } else {
        // Check if it's REQUEST_ROOM_TEMP
        StaticJsonDocument<128> checkDoc;
        if (deserializeJson(checkDoc, msg) == DeserializationError::Ok) {
          if (checkDoc.containsKey("command") && String(checkDoc["command"].as<const char*>()) == "REQUEST_ROOM_TEMP") {
            shouldLog = false;
          }
        }
      }
      
      if (shouldLog) {
        Serial.print("📨 Received message from server: ");
        Serial.println(msg.substring(0, 100));
      }
      
      handleMessage(msg);
      break;
    }

    case WStype_PONG:
      break;

    case WStype_ERROR:
      break;

    default:
      break;
  }
}

// ==================== MESSAGE HANDLER ====================
void handleMessage(String message) {
  // Handle ping/pong silently (matching simulator)
  if (message == "ping" || message == "PING") {
    webSocket.sendTXT("pong");
    return;
  }

  // Parse JSON
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, message);
  if (err) {
    return;
  }

  handleIncomingJson(message);
}

// ==================== INCOMING JSON HANDLER ====================
void handleIncomingJson(const String &payload) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    return;
  }

  JsonObject obj = doc.as<JsonObject>();

  // Handle POWER_ON command
  if (obj.containsKey("type")) {
    String t = obj["type"].as<String>();
    
    if (t == "POWER_ON") {
      // Simulator logic: if (deviceState.power !== true)
      if (device.power != true) {
        device.power = true;
        // Set pin based on hardware type
        if (HARDWARE_ACTIVE_HIGH) {
          digitalWrite(POWER_PIN, HIGH);  // Active HIGH: HIGH = ON
        } else {
          digitalWrite(POWER_PIN, LOW);    // Active LOW: LOW = ON
        }
        Serial.printf("📊 [SYNC] Power: ON, Temp: %d°C\n", device.temperature);
        sendPowerUpdate();
        updateDisplay();  // Update display
        // Send room temp on power ON after small delay
        delay(200);
        readAndSendRoomTemp();
        startRoomTempAuto();
      }
      return;
    }

    // Handle POWER_OFF command
    if (t == "POWER_OFF") {
      // Simulator logic: if (deviceState.power !== false)
      if (device.power != false) {
        device.power = false;
        // Set pin based on hardware type
        if (HARDWARE_ACTIVE_HIGH) {
          digitalWrite(POWER_PIN, LOW);   // Active HIGH: LOW = OFF
        } else {
          digitalWrite(POWER_PIN, HIGH);   // Active LOW: HIGH = OFF
        }
        Serial.printf("📊 [SYNC] Power: OFF, Temp: %d°C\n", device.temperature);
        sendPowerUpdate();
        updateDisplay();  // Update display
        stopRoomTempAuto();
      }
      return;
    }

    // Handle SET_TEMP command (bypasses lock and event - direct command from backend)
    if (t == "SET_TEMP" && obj.containsKey("temp")) {
      int target = obj["temp"].as<int>();
      if (target >= TEMP_MIN && target <= TEMP_MAX) {
        int oldTemp = device.temperature;
        int diff = target - oldTemp;
        device.temperature = target;
        
        // Send pulses to physical pins (SET_TEMP bypasses lock/event - it's a direct command)
        if (diff != 0) {
          int pin = diff > 0 ? POSITIVE_TEMP_PIN : NEGATIVE_TEMP_PIN;
          sendPulses(pin, abs(diff));
        }
        
        Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: %d\n", oldTemp, device.temperature, diff);
        sendTempUpdate();
        updateDisplay();  // Update display
      }
      return;
    }

    // Handle TEMP_PULSE command
    if (t == "TEMP_PULSE" && obj.containsKey("diff")) {
      int pulseCount = obj["diff"].as<int>();
      int previousTemp = device.temperature;
      bool tempChanged = false;

      if (pulseCount > 0 && device.temperature < TEMP_MAX) {
        const int maxIncrease = min(pulseCount, TEMP_MAX - device.temperature);
        device.temperature = device.temperature + maxIncrease;
        tempChanged = maxIncrease > 0;
        if (tempChanged) {
          sendPulses(POSITIVE_TEMP_PIN, maxIncrease);
          const char* pulseType = pulseCount > 0 ? "+" : "";
          Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: %s%d (POSITIVE)\n", previousTemp, device.temperature, pulseType, pulseCount);
        }
      } else if (pulseCount < 0 && device.temperature > TEMP_MIN) {
        const int maxDecrease = min(abs(pulseCount), device.temperature - TEMP_MIN);
        device.temperature = device.temperature - maxDecrease;
        tempChanged = maxDecrease > 0;
        if (tempChanged) {
          sendPulses(NEGATIVE_TEMP_PIN, maxDecrease);
          Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: %d (NEGATIVE)\n", previousTemp, device.temperature, pulseCount);
        }
      }

      if (tempChanged) {
        sendTempUpdate();
        updateDisplay();  // Update display
      }
      return;
    }

    // Handle LOCK command
    if (t == "LOCK") {
      if (!device.lockState) {
        device.lockState = true;
        device.lockedTemperature = device.temperature;
        Serial.printf("🔒 [REMOTE LOCK] LOCKED | Locked Temp: %d°C\n", device.lockedTemperature);
        sendLockUpdate();
        updateDisplay();  // Update display
      }
      return;
    }

    // Handle UNLOCK command
    if (t == "UNLOCK") {
      if (device.lockState) {
        device.lockState = false;
        device.lockedTemperature = 0;
        Serial.println("🔓 [REMOTE LOCK] UNLOCKED");
        sendLockUpdate();
        updateDisplay();  // Update display
      }
      return;
    }
  }

  // Handle command-based messages
  if (obj.containsKey("command")) {
    String cmd = obj["command"].as<String>();

    if (cmd == "REQUEST_ROOM_TEMP") {
      readAndSendRoomTemp();
      return;
    }

    if (cmd == "LOCK_STATE") {
      handleLockState(obj);
      return;
    }

    if (cmd == "EVENT_STATUS") {
      handleEventStatus(obj);
      return;
    }
  }

  // Handle legacy power/temp commands (matching simulator handleCommand)
  if (obj.containsKey("power") || obj.containsKey("temp")) {
    handleCommand(obj);
    return;
  }
}

// ==================== COMMAND HANDLER (LEGACY) ====================
// Each command is INDEPENDENT - no dependencies between commands
void handleCommand(JsonObject command) {
  bool changed = false;

  // POWER COMMAND - Completely independent (matching simulator)
  if (command.containsKey("power")) {
    bool newPower = command["power"].as<int>() == 1;
    
    // Simulator logic: if (command.power !== deviceState.power)
    if (newPower != device.power) {
      device.power = newPower;
      // Set pin based on hardware type
      if (HARDWARE_ACTIVE_HIGH) {
        digitalWrite(POWER_PIN, device.power ? HIGH : LOW);  // Active HIGH
      } else {
        digitalWrite(POWER_PIN, device.power ? LOW : HIGH);   // Active LOW
      }
      changed = true;
      Serial.printf("📊 [SYNC] Power: %s, Temp: %d°C\n", device.power ? "ON" : "OFF", device.temperature);
      sendPowerUpdate();
      updateDisplay();  // Update display
      
      // Auto room temp management (independent side effect, doesn't affect other commands)
      if (device.power) {
        delay(200);
        readAndSendRoomTemp();
        startRoomTempAuto();
      } else {
        stopRoomTempAuto();
      }
    }
  }

  // TEMPERATURE COMMAND - Completely independent (only blocked by event if active)
  if (command.containsKey("temp")) {
    // Block temperature changes when event is active (only for button-based changes)
    if (device.isEventActive) {
      Serial.printf("🚫 [TEMP] Temperature change blocked - Event is active (Event temp: %d°C)\n", device.eventTemperature);
      Serial.println("⚠️ [BUTTONS] +/- buttons disabled - Event is active");
      return;
    }

    int pulseCount = command["temp"].as<int>();
    int previousTemp = device.temperature;

    // Always log temp change attempt (even if no change)
    if (pulseCount != 0) {
      int absPulseCount = abs(pulseCount);
      bool tempChanged = false;

      if (pulseCount > 0 && device.temperature < TEMP_MAX) {
        int maxIncrease = min(absPulseCount, TEMP_MAX - device.temperature);
        if (maxIncrease > 0) {
          sendPulses(POSITIVE_TEMP_PIN, maxIncrease);
          device.temperature = device.temperature + maxIncrease;
          tempChanged = true;
          changed = true;
        }
        const char* pulseType = pulseCount > 0 ? "+" : "";
      Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: %s%d\n", previousTemp, device.temperature, pulseType, pulseCount);
      } else if (pulseCount < 0 && device.temperature > TEMP_MIN) {
        int maxDecrease = min(absPulseCount, device.temperature - TEMP_MIN);
        if (maxDecrease > 0) {
          sendPulses(NEGATIVE_TEMP_PIN, maxDecrease);
          device.temperature = device.temperature - maxDecrease;
          tempChanged = true;
          changed = true;
        }
        Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: %d\n", previousTemp, device.temperature, pulseCount);
      } else {
        // Pulse received but temp can't change (at limit)
        Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: %d\n", previousTemp, device.temperature, pulseCount);
      }

      if (tempChanged) {
        sendTempUpdate();
        updateDisplay();  // Update display
      }
    }
  }

  // Send state update
  if (changed) {
    sendStateUpdate(false);
  }
}

// ==================== EVENT STATUS HANDLER ====================
void handleEventStatus(JsonObject command) {
  String status = command["status"].as<String>();

  // Set event active state based on status (matching simulator)
  if (status == "event created" || status == "event temp" || status == "enable") {
    device.isEventActive = true;
    Serial.println("🚫 [BUTTONS] +/- buttons DISABLED - Event is active");
    
    if (command.containsKey("temperature")) {
      int eventTemp = command["temperature"].as<int>();
      device.eventTemperature = eventTemp;
      // Update device temperature to event temperature
      int previousTemp = device.temperature;
      device.temperature = eventTemp;
      
      // Send pulses to physical pins
      int diff = eventTemp - previousTemp;
      if (diff != 0) {
        int pin = diff > 0 ? POSITIVE_TEMP_PIN : NEGATIVE_TEMP_PIN;
        sendPulses(pin, abs(diff));
      }
      
      Serial.printf("📅 [EVENT] %s | Temp: %d°C\n", status.c_str(), device.temperature);
      
      // Send state update to backend
      sendStateUpdate(false);
      Serial.printf("📊 [SYNC] Power: %s, Temp: %d°C\n", device.power ? "ON" : "OFF", device.temperature);
      updateDisplay();  // Update display
    } else {
      Serial.printf("📅 [EVENT] %s\n", status.c_str());
    }
  } else if (status == "event end" || status == "disable") {
    device.isEventActive = false;
    device.eventTemperature = 0;
    Serial.println("✅ [BUTTONS] +/- buttons ENABLED - Event disabled");
    Serial.printf("📅 [EVENT] %s\n", status.c_str());
  } else {
    Serial.printf("📅 [EVENT] %s\n", status.c_str());
  }
}

// ==================== LOCK STATE HANDLER ====================
void handleLockState(JsonObject command) {
  bool wasLocked = device.lockState;
  device.lockState = command["locked"].as<int>() == 1;

  if (command.containsKey("lockedTemperature")) {
    device.lockedTemperature = command["lockedTemperature"].as<int>();
  }

  // Log lock state changes (matching simulator)
  if (device.lockState && !wasLocked) {
    Serial.printf("🔒 [REMOTE LOCK] LOCKED | Locked Temp: %d°C\n", device.lockedTemperature);
    updateDisplay();  // Update display
  } else if (!device.lockState && wasLocked) {
    Serial.println("🔓 [REMOTE LOCK] UNLOCKED");
    updateDisplay();  // Update display
  }
}

// ==================== ROOM TEMPERATURE HANDLER ====================
void readAndSendRoomTemp() {
  if (!device.power) {
    Serial.println("⏸️ [ROOM_TEMP] Device is OFF, skipping room temp send");
    return;
  }

  float t = dht.readTemperature();
  if (isnan(t)) {
    Serial.println("⚠️ [ROOM_TEMP] Failed to read DHT");
    return;
  }

  device.roomTemperature = t;
  Serial.printf("🌡️ [ROOM TEMP] Room: %.1f°C | Device: %d°C\n", device.roomTemperature, device.temperature);
  updateDisplay();  // Update display with room temp

  StaticJsonDocument<256> doc;
  doc["device_id"] = device.deviceKey.length() ? device.deviceKey : String(serial_number);
  doc["room_temp"] = device.roomTemperature;
  doc["temp"] = device.temperature;
  doc["power"] = device.power ? 1 : 0;
  String out;
  serializeJson(doc, out);

  if (device.isConnected) {
    webSocket.sendTXT(out);
  } else {
    Serial.println("⚠️ [ROOM_TEMP] WebSocket not connected, cannot send");
  }
}

// ==================== AUTO ROOM TEMP CONTROL ====================
void startRoomTempAuto() {
  roomTempTicker = millis();
}

void stopRoomTempAuto() {
  roomTempTicker = 0;
}

// ==================== HARDWARE TEST FUNCTION ====================
// Test all pins to verify hardware is working
// Uncomment testHardwarePins() in setup() to enable
void testHardwarePins() {
  Serial.println("\n🔧 [HARDWARE TEST] Starting pin test...");
  Serial.printf("   └─ Hardware Type: %s\n", HARDWARE_ACTIVE_HIGH ? "Active HIGH" : "Active LOW");
  
  int idleState = HARDWARE_ACTIVE_HIGH ? LOW : HIGH;
  int activeState = HARDWARE_ACTIVE_HIGH ? HIGH : LOW;
  
  // Test POWER_PIN
  Serial.println("   └─ Testing POWER_PIN...");
  digitalWrite(POWER_PIN, activeState);
  delay(500);
  digitalWrite(POWER_PIN, idleState);
  delay(500);
  
  // Test POSITIVE_TEMP_PIN
  Serial.println("   └─ Testing POSITIVE_TEMP_PIN...");
  digitalWrite(POSITIVE_TEMP_PIN, activeState);
  delay(500);
  digitalWrite(POSITIVE_TEMP_PIN, idleState);
  delay(500);
  
  // Test NEGATIVE_TEMP_PIN
  Serial.println("   └─ Testing NEGATIVE_TEMP_PIN...");
  digitalWrite(NEGATIVE_TEMP_PIN, activeState);
  delay(500);
  digitalWrite(NEGATIVE_TEMP_PIN, idleState);
  delay(500);
  
  Serial.println("✅ [HARDWARE TEST] Pin test completed\n");
}

// ==================== MESSAGE SENDERS ====================
void sendDeviceConnected() {
  StaticJsonDocument<200> doc;
  doc["type"] = "DEVICE_CONNECTED";
  doc["serial"] = String(serial_number);
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
  if (device.deviceKey.length() == 0) {
    device.deviceKey = String(serial_number);
  }
}

void sendPowerUpdate() {
  StaticJsonDocument<200> doc;
  doc["type"] = "POWER_UPDATE";
  doc["serial"] = String(serial_number);
  doc["power"] = device.power ? 1 : 0;
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
}

void sendTempUpdate() {
  StaticJsonDocument<200> doc;
  doc["type"] = "TEMP_UPDATE";
  doc["serial"] = String(serial_number);
  doc["temp"] = device.temperature;
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
}

void sendLockUpdate() {
  StaticJsonDocument<200> doc;
  doc["type"] = "LOCK_UPDATE";
  doc["serial"] = String(serial_number);
  doc["locked"] = device.lockState ? 1 : 0;
  if (device.lockState) {
    doc["locked_temperature"] = device.lockedTemperature;
  }
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
}

void sendStateUpdate(bool remoteFlag) {
  if (!device.isConnected) {
    return;
  }

  StaticJsonDocument<256> doc;
  doc["device_id"] = device.deviceKey.length() ? device.deviceKey : String(serial_number);
  doc["temp"] = device.temperature;
  doc["power"] = device.power ? 1 : 0;
  doc["remote"] = remoteFlag ? 1 : 0;
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
}

// ==================== PULSE SENDER ====================
// Simulates button press for AC remote control
// Pattern: Press -> Hold -> Release -> Wait between presses
void sendPulses(int pin, int count) {
  // Determine idle and active states based on hardware type
  int idleState = HARDWARE_ACTIVE_HIGH ? LOW : HIGH;   // Idle state
  int activeState = HARDWARE_ACTIVE_HIGH ? HIGH : LOW; // Pressed state
  
  // Ensure pin starts in idle state
  digitalWrite(pin, idleState);
  delay(50);
  
  for (int i = 0; i < count; i++) {
    // Press button: Set to active state
    digitalWrite(pin, activeState);
    delay(PULSE_PRESS_TIME_MS); // Hold button pressed (200ms)
    
    // Release button: Set to idle state
    digitalWrite(pin, idleState);
    delay(PULSE_RELEASE_TIME_MS); // Wait between button presses (300ms)
    
    // Allow WebSocket to process during delays (non-blocking)
    webSocket.loop();
  }
  
  // Ensure pin is in idle state after all pulses
  digitalWrite(pin, idleState);
  delay(50);
}

// ==================== DISPLAY UPDATE FUNCTION ====================
// Updates LCD display with current AC status
void updateDisplay() {
  #if USE_DISPLAY
  lcd.clear();
  
  // Line 1: Power status and Temperature
  lcd.setCursor(0, 0);
  if (device.power) {
    lcd.print("AC: ON  ");
  } else {
    lcd.print("AC: OFF ");
  }
  lcd.print("T:");
  lcd.print(device.temperature);
  lcd.print("C");
  
  // Line 2: Room temp and Lock status
  lcd.setCursor(0, 1);
  if (device.roomTemperature > 0) {
    lcd.print("Room:");
    lcd.print((int)device.roomTemperature);
    lcd.print("C ");
  } else {
    lcd.print("Room:--- ");
  }
  
  if (device.lockState) {
    lcd.print("LOCK");
  } else {
    lcd.print("     ");
  }
  
  // Show connection status indicator
  if (device.isConnected) {
    lcd.setCursor(15, 0);
    lcd.print("*");
  }
  #endif
}