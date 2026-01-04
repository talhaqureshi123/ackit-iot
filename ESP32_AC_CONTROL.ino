#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <IRremote.h>

// ==================== CONFIGURATION ====================
const char* ssid = "iPhone";
const char* password = "12234567";
const char* websocket_server = "ackit-iot-production.up.railway.app";
const int websocket_port = 443;
const char* websocket_path = "/esp32";
const char* serial_number = "AC-919834-359";

// ==================== PINS ====================
#define POWER_PIN           33
#define POSITIVE_TEMP_PIN   26
#define NEGATIVE_TEMP_PIN   25
#define ROOM_TEMP_SENSOR_PIN 23
#define TSOP_PIN             4

// Pulse timing
#define PULSE_PRESS_TIME_MS   200
#define PULSE_RELEASE_TIME_MS 300

// Hardware config
#define HARDWARE_ACTIVE_HIGH false

// Temperature limits
const int TEMP_MIN = 16;
const int TEMP_MAX = 30;

// ==================== SENSORS ====================
#define DHTTYPE DHT11
DHT dht(ROOM_TEMP_SENSOR_PIN, DHTTYPE);
WebSocketsClient webSocket;

// ==================== DEVICE STATE ====================
struct DeviceState {
  bool power = false;
  int temperature = 20;
  float roomTemperature = 0.0;
  bool lockState = false;
  int lockedTemperature = 0;
  bool isConnected = false;
  char deviceKey[32] = "";
  bool isEventActive = false;
  int eventTemperature = 0;
  char eventType[20] = ""; // "simple", "recurring", or "device-power"
  bool eventControlsPower = false; // For device-power events
} device;

// Timing
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000UL;
unsigned long lastIrSendMillis = 0;
const unsigned long irDebounceMs = 1500UL;
unsigned long roomTempTicker = 0;
const unsigned long ROOM_TEMP_INTERVAL_MS = 5UL * 60UL * 1000UL;

// Forward declarations
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void handleIncomingJson(JsonObject obj);
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

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n🚀 ESP32 Device Module starting...");

  // Pins initialization
  pinMode(POWER_PIN, OUTPUT);
  pinMode(POSITIVE_TEMP_PIN, OUTPUT);
  pinMode(NEGATIVE_TEMP_PIN, OUTPUT);
  
  int idleState = HARDWARE_ACTIVE_HIGH ? LOW : HIGH;
  digitalWrite(POWER_PIN, idleState);
  digitalWrite(POSITIVE_TEMP_PIN, idleState);
  digitalWrite(NEGATIVE_TEMP_PIN, idleState);

  dht.begin();
  IrReceiver.begin(TSOP_PIN, ENABLE_LED_FEEDBACK);

  // WiFi connect
  Serial.print("📡 [WiFi] Connecting to: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("✅ [WiFi] Connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("❌ [WiFi] Connection failed!");
  }

  // WebSocket setup
  webSocket.onEvent(webSocketEvent);
  webSocket.beginSSL(websocket_server, websocket_port, websocket_path);
  webSocket.setReconnectInterval(5000);
  Serial.println("🔐 [WS] Connecting to Railway...");
}

// ==================== LOOP ====================
void loop() {
  webSocket.loop();

  // WiFi reconnect
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > reconnectInterval) {
      lastReconnectAttempt = now;
      WiFi.begin(ssid, password);
    }
  }

  // IR handling
  if (IrReceiver.decode()) {
    unsigned long now = millis();
    if (now - lastIrSendMillis > irDebounceMs && device.isConnected) {
      lastIrSendMillis = now;
      StaticJsonDocument<150> doc;
      
      if (device.lockState) {
        doc["type"] = "IR_VIOLATION";
        doc["serial"] = serial_number;
      } else {
        doc["device_id"] = serial_number;
        doc["remote_lock"] = true;
      }
      
      String out;
      serializeJson(doc, out);
      webSocket.sendTXT(out);
    }
    IrReceiver.resume();
  }

  // Auto room temp (every 5 minutes)
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

    case WStype_CONNECTED:
      Serial.println("✅ [WS] CONNECTED to Railway server!");
      device.isConnected = true;
      delay(100);
      sendDeviceConnected();
      delay(200);
      if (device.power) {
        readAndSendRoomTemp();
      }
      startRoomTempAuto();
      break;

    case WStype_TEXT: {
      // Handle ping/pong
      if (length == 4 && (memcmp(payload, "ping", 4) == 0 || memcmp(payload, "PING", 4) == 0)) {
        webSocket.sendTXT("pong");
        break;
      }
      
      // Parse JSON
      char msgBuffer[192];
      size_t msgLen = (length > 191) ? 191 : length;
      memcpy(msgBuffer, payload, msgLen);
      msgBuffer[msgLen] = '\0';
      
      StaticJsonDocument<192> doc;
      DeserializationError err = deserializeJson(doc, msgBuffer);
      
      if (err) break;
      
      // Skip logging for routine messages
      bool shouldLog = true;
      if (doc.containsKey("command")) {
        const char* cmd = doc["command"].as<const char*>();
        if (cmd && strcmp(cmd, "REQUEST_ROOM_TEMP") == 0) {
          shouldLog = false;
          readAndSendRoomTemp();
          break;
        }
      }
      
      if (shouldLog) {
        Serial.print("📨 Received: ");
        Serial.write(payload, msgLen > 60 ? 60 : msgLen);
        Serial.println();
      }
      
      handleIncomingJson(doc.as<JsonObject>());
      break;
    }

    case WStype_ERROR:
      Serial.println("⚠️ [WS] ERROR occurred");
      device.isConnected = false;
      break;

    default:
      break;
  }
}

// ==================== INCOMING JSON HANDLER ====================
void handleIncomingJson(JsonObject obj) {
  // Handle type-based commands
  if (obj.containsKey("type")) {
    const char* t = obj["type"].as<const char*>();
    if (!t) return;
    
    if (strcmp(t, "POWER_ON") == 0) {
      if (device.power != true) {
        device.power = true;
        digitalWrite(POWER_PIN, HARDWARE_ACTIVE_HIGH ? HIGH : LOW);
        Serial.printf("📊 [SYNC] Power: ON, Temp: %d°C\n", device.temperature);
        sendPowerUpdate();
        delay(200);
        readAndSendRoomTemp();
        startRoomTempAuto();
      }
      return;
    }

    if (strcmp(t, "POWER_OFF") == 0) {
      if (device.power != false) {
        device.power = false;
        digitalWrite(POWER_PIN, HARDWARE_ACTIVE_HIGH ? LOW : HIGH);
        Serial.printf("📊 [SYNC] Power: OFF, Temp: %d°C\n", device.temperature);
        sendPowerUpdate();
        stopRoomTempAuto();
      }
      return;
    }

    if (strcmp(t, "SET_TEMP") == 0 && obj.containsKey("temp")) {
      int target = obj["temp"].as<int>();
      if (target >= TEMP_MIN && target <= TEMP_MAX) {
        int oldTemp = device.temperature;
        int diff = target - oldTemp;
        
        Serial.printf("📥 [SET_TEMP] Received: %d°C | Current: %d°C | Diff: %d\n", target, oldTemp, diff);
        
        // Always update device temperature state to match database
        device.temperature = target;
        
        // Send pulses only if there's a difference
        if (diff != 0) {
          int pin = diff > 0 ? POSITIVE_TEMP_PIN : NEGATIVE_TEMP_PIN;
          sendPulses(pin, abs(diff));
          Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: %d\n", oldTemp, device.temperature, diff);
        } else {
          Serial.printf("🌡️ [TEMP] Already at %d°C, no pulses needed\n", device.temperature);
        }
        
        // Always send update back to backend to confirm state
        sendTempUpdate();
        Serial.printf("✅ [SET_TEMP] Temperature updated and confirmed: %d°C\n", device.temperature);
      } else {
        Serial.printf("❌ [SET_TEMP] Invalid temperature: %d°C (must be %d-%d°C)\n", target, TEMP_MIN, TEMP_MAX);
      }
      return;
    }

    if (strcmp(t, "TEMP_PULSE") == 0 && obj.containsKey("diff")) {
      int pulseCount = obj["diff"].as<int>();
      int previousTemp = device.temperature;
      bool tempChanged = false;

      if (pulseCount > 0 && device.temperature < TEMP_MAX) {
        const int maxIncrease = min(pulseCount, TEMP_MAX - device.temperature);
        device.temperature += maxIncrease;
        tempChanged = maxIncrease > 0;
        if (tempChanged) {
          sendPulses(POSITIVE_TEMP_PIN, maxIncrease);
          Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: +%d\n", previousTemp, device.temperature, pulseCount);
        }
      } else if (pulseCount < 0 && device.temperature > TEMP_MIN) {
        const int maxDecrease = min(abs(pulseCount), device.temperature - TEMP_MIN);
        device.temperature -= maxDecrease;
        tempChanged = maxDecrease > 0;
        if (tempChanged) {
          sendPulses(NEGATIVE_TEMP_PIN, maxDecrease);
          Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: %d\n", previousTemp, device.temperature, pulseCount);
        }
      }

      if (tempChanged) {
        sendTempUpdate();
      }
      return;
    }

    if (strcmp(t, "LOCK") == 0) {
      if (!device.lockState) {
        device.lockState = true;
        device.lockedTemperature = device.temperature;
        Serial.printf("🔒 [REMOTE LOCK] LOCKED | Locked Temp: %d°C\n", device.lockedTemperature);
        sendLockUpdate();
      }
      return;
    }

    if (strcmp(t, "UNLOCK") == 0) {
      if (device.lockState) {
        device.lockState = false;
        device.lockedTemperature = 0;
        Serial.println("🔓 [REMOTE LOCK] UNLOCKED");
        sendLockUpdate();
      }
      return;
    }
  }

  // Handle command-based messages
  if (obj.containsKey("command")) {
    const char* cmd = obj["command"].as<const char*>();
    if (!cmd) return;

    if (strcmp(cmd, "LOCK_STATE") == 0) {
      handleLockState(obj);
      return;
    }

    if (strcmp(cmd, "EVENT_STATUS") == 0) {
      handleEventStatus(obj);
      return;
    }
  }

  // Handle legacy commands
  if (obj.containsKey("power") || obj.containsKey("temp")) {
    handleCommand(obj);
  }
}

// ==================== COMMAND HANDLER ====================
void handleCommand(JsonObject command) {
  bool changed = false;

  // POWER COMMAND
  if (command.containsKey("power")) {
    bool newPower = command["power"].as<int>() == 1;
    
    if (newPower != device.power) {
      device.power = newPower;
      digitalWrite(POWER_PIN, HARDWARE_ACTIVE_HIGH ? (device.power ? HIGH : LOW) : (device.power ? LOW : HIGH));
      changed = true;
      Serial.printf("📊 [SYNC] Power: %s, Temp: %d°C\n", device.power ? "ON" : "OFF", device.temperature);
      sendPowerUpdate();
      
      if (device.power) {
        delay(200);
        readAndSendRoomTemp();
        startRoomTempAuto();
      } else {
        stopRoomTempAuto();
      }
    }
  }

  // TEMPERATURE COMMAND
  if (command.containsKey("temp")) {
    if (device.isEventActive) {
      Serial.printf("🚫 [TEMP] Temperature change blocked - Event is active (Event temp: %d°C)\n", device.eventTemperature);
      return;
    }

    int pulseCount = command["temp"].as<int>();
    int previousTemp = device.temperature;

    if (pulseCount != 0) {
      bool tempChanged = false;

      if (pulseCount > 0 && device.temperature < TEMP_MAX) {
        int maxIncrease = min(abs(pulseCount), TEMP_MAX - device.temperature);
        if (maxIncrease > 0) {
          sendPulses(POSITIVE_TEMP_PIN, maxIncrease);
          device.temperature += maxIncrease;
          tempChanged = true;
          changed = true;
        }
        Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: +%d\n", previousTemp, device.temperature, pulseCount);
      } else if (pulseCount < 0 && device.temperature > TEMP_MIN) {
        int maxDecrease = min(abs(pulseCount), device.temperature - TEMP_MIN);
        if (maxDecrease > 0) {
          sendPulses(NEGATIVE_TEMP_PIN, maxDecrease);
          device.temperature -= maxDecrease;
          tempChanged = true;
          changed = true;
        }
        Serial.printf("🌡️ [TEMP] %d°C → %d°C | Pulse: %d\n", previousTemp, device.temperature, pulseCount);
      }

      if (tempChanged) {
        sendTempUpdate();
      }
    }
  }

  if (changed) {
    sendStateUpdate(false);
  }
}

// ==================== EVENT STATUS HANDLER ====================
// Handles three event types:
// 1. Simple Event - One-time temperature control
// 2. Recurring Event - Weekly recurring temperature control
// 3. Device Power Event - Device ON/OFF control (with optional temperature)
void handleEventStatus(JsonObject command) {
  const char* status = command["status"].as<const char*>();
  if (!status) return;

  // Get event type if provided (simple, recurring, device-power)
  if (command.containsKey("eventType")) {
    const char* evtType = command["eventType"].as<const char*>();
    if (evtType) {
      strncpy(device.eventType, evtType, sizeof(device.eventType) - 1);
      device.eventType[sizeof(device.eventType) - 1] = '\0';
      Serial.printf("📅 [EVENT TYPE] %s event\n", device.eventType);
    }
  }

  // Check if this is a device-power event
  if (command.containsKey("controlDevicePower")) {
    device.eventControlsPower = command["controlDevicePower"].as<bool>();
  }

  // Event start/activate handlers
  if (strcmp(status, "event created") == 0 || strcmp(status, "event temp") == 0 || strcmp(status, "enable") == 0) {
    device.isEventActive = true;
    Serial.println("🚫 [BUTTONS] +/- buttons DISABLED - Event is active");
    
    // Handle device-power events (ON/OFF control)
    if (device.eventControlsPower || strcmp(device.eventType, "device-power") == 0) {
      Serial.println("🔌 [EVENT] Device Power Control Event");
      
      // Check if power command is provided
      if (command.containsKey("powerOn")) {
        bool shouldPowerOn = command["powerOn"].as<bool>();
        if (shouldPowerOn && !device.power) {
          // Turn device ON
          device.power = true;
          digitalWrite(POWER_PIN, HARDWARE_ACTIVE_HIGH ? HIGH : LOW);
          Serial.println("🔌 [EVENT] Device turned ON by event");
          sendPowerUpdate();
          delay(200);
          readAndSendRoomTemp();
          startRoomTempAuto();
        } else if (!shouldPowerOn && device.power) {
          // Turn device OFF
          device.power = false;
          digitalWrite(POWER_PIN, HARDWARE_ACTIVE_HIGH ? LOW : HIGH);
          Serial.println("🔌 [EVENT] Device turned OFF by event");
          sendPowerUpdate();
          stopRoomTempAuto();
        }
      }
      
      // Optional temperature for device-power events
      if (command.containsKey("temperature")) {
        int eventTemp = command["temperature"].as<int>();
        if (eventTemp >= TEMP_MIN && eventTemp <= TEMP_MAX) {
          device.eventTemperature = eventTemp;
          int previousTemp = device.temperature;
          device.temperature = eventTemp;
          
          int diff = eventTemp - previousTemp;
          if (diff != 0) {
            int pin = diff > 0 ? POSITIVE_TEMP_PIN : NEGATIVE_TEMP_PIN;
            sendPulses(pin, abs(diff));
          }
          Serial.printf("🌡️ [EVENT] Temperature set to %d°C (device-power event)\n", device.temperature);
          sendTempUpdate();
        }
      }
      
      sendStateUpdate(false);
      Serial.printf("📊 [SYNC] Power: %s, Temp: %d°C\n", device.power ? "ON" : "OFF", device.temperature);
    } 
    // Handle simple/recurring events (temperature control)
    else {
      if (command.containsKey("temperature")) {
        int eventTemp = command["temperature"].as<int>();
        device.eventTemperature = eventTemp;
        int previousTemp = device.temperature;
        device.temperature = eventTemp;
        
        int diff = eventTemp - previousTemp;
        if (diff != 0) {
          int pin = diff > 0 ? POSITIVE_TEMP_PIN : NEGATIVE_TEMP_PIN;
          sendPulses(pin, abs(diff));
        }
        
        const char* evtTypeStr = strcmp(device.eventType, "recurring") == 0 ? "Recurring" : "Simple";
        Serial.printf("📅 [EVENT] %s Event | Status: %s | Temp: %d°C\n", evtTypeStr, status, device.temperature);
        sendStateUpdate(false);
        Serial.printf("📊 [SYNC] Power: %s, Temp: %d°C\n", device.power ? "ON" : "OFF", device.temperature);
      }
    }
  } 
  // Event end/stop/disable handlers
  else if (strcmp(status, "event end") == 0 || strcmp(status, "disable") == 0 || strcmp(status, "event stop") == 0) {
    device.isEventActive = false;
    device.eventTemperature = 0;
    device.eventControlsPower = false;
    device.eventType[0] = '\0'; // Clear event type
    Serial.println("✅ [BUTTONS] +/- buttons ENABLED - Event disabled/ended");
    
    // For device-power events, optionally turn device OFF when event ends
    // (This is optional - backend controls this)
    if (command.containsKey("powerOff") && command["powerOff"].as<bool>()) {
      if (device.power) {
        device.power = false;
        digitalWrite(POWER_PIN, HARDWARE_ACTIVE_HIGH ? LOW : HIGH);
        Serial.println("🔌 [EVENT] Device turned OFF - Event ended");
        sendPowerUpdate();
        stopRoomTempAuto();
      }
    }
    
    sendStateUpdate(false);
  }
}

// ==================== LOCK STATE HANDLER ====================
void handleLockState(JsonObject command) {
  bool wasLocked = device.lockState;
  device.lockState = command["locked"].as<int>() == 1;

  if (command.containsKey("lockedTemperature")) {
    device.lockedTemperature = command["lockedTemperature"].as<int>();
  }

  if (device.lockState && !wasLocked) {
    Serial.printf("🔒 [REMOTE LOCK] LOCKED | Locked Temp: %d°C\n", device.lockedTemperature);
    sendLockUpdate();
  } else if (!device.lockState && wasLocked) {
    Serial.println("🔓 [REMOTE LOCK] UNLOCKED");
    sendLockUpdate();
  }
}

// ==================== ROOM TEMPERATURE HANDLER ====================
void readAndSendRoomTemp() {
  if (!device.power) {
    return;
  }

  float t = dht.readTemperature();
  if (isnan(t)) {
    return;
  }

  device.roomTemperature = t;
  Serial.printf("🌡️ [ROOM TEMP] Room: %.1f°C | Device: %d°C\n", device.roomTemperature, device.temperature);

  StaticJsonDocument<192> doc;
  doc["device_id"] = (strlen(device.deviceKey) > 0) ? device.deviceKey : serial_number;
  doc["room_temp"] = device.roomTemperature;
  doc["temp"] = device.temperature;
  doc["power"] = device.power ? 1 : 0;
  
  String out;
  serializeJson(doc, out);

  if (device.isConnected) {
    webSocket.sendTXT(out);
  }
}

// ==================== AUTO ROOM TEMP CONTROL ====================
void startRoomTempAuto() {
  roomTempTicker = millis();
}

void stopRoomTempAuto() {
  roomTempTicker = 0;
}

// ==================== MESSAGE SENDERS ====================
void sendDeviceConnected() {
  StaticJsonDocument<150> doc;
  doc["type"] = "DEVICE_CONNECTED";
  doc["serial"] = serial_number;
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
  if (strlen(device.deviceKey) == 0) {
    strncpy(device.deviceKey, serial_number, sizeof(device.deviceKey) - 1);
  }
}

void sendPowerUpdate() {
  StaticJsonDocument<150> doc;
  doc["type"] = "POWER_UPDATE";
  doc["serial"] = serial_number;
  doc["power"] = device.power ? 1 : 0;
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
}

void sendTempUpdate() {
  StaticJsonDocument<150> doc;
  doc["type"] = "TEMP_UPDATE";
  doc["serial"] = serial_number;
  doc["temp"] = device.temperature;
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
}

void sendLockUpdate() {
  StaticJsonDocument<150> doc;
  doc["type"] = "LOCK_UPDATE";
  doc["serial"] = serial_number;
  doc["locked"] = device.lockState ? 1 : 0;
  if (device.lockState) {
    doc["locked_temperature"] = device.lockedTemperature;
  }
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
}

void sendStateUpdate(bool remoteFlag) {
  if (!device.isConnected) return;

  StaticJsonDocument<192> doc;
  doc["device_id"] = (strlen(device.deviceKey) > 0) ? device.deviceKey : serial_number;
  doc["temp"] = device.temperature;
  doc["power"] = device.power ? 1 : 0;
  doc["remote"] = remoteFlag ? 1 : 0;
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
}

// ==================== PULSE SENDER ====================
void sendPulses(int pin, int count) {
  int idleState = HARDWARE_ACTIVE_HIGH ? LOW : HIGH;
  int activeState = HARDWARE_ACTIVE_HIGH ? HIGH : LOW;
  
  digitalWrite(pin, idleState);
  delay(50);
  
  for (int i = 0; i < count; i++) {
    digitalWrite(pin, activeState);
    delay(PULSE_PRESS_TIME_MS);
    digitalWrite(pin, idleState);
    delay(PULSE_RELEASE_TIME_MS);
    webSocket.loop();
  }
  
  digitalWrite(pin, idleState);
  delay(50);
}
