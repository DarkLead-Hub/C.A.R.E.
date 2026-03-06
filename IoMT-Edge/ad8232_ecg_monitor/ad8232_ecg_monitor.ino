/*
 * ═══════════════════════════════════════════════════════
 *   AD8232 ECG Monitor - UART Serial Output
 *   3-Lead (LA, RA, RL) Configuration
 * ═══════════════════════════════════════════════════════
 *
 *  Serial Output Format: "value,leadOff\n"
 *    value   = 10-bit ADC reading (0-1023)
 *    leadOff = 1 if leads are disconnected, 0 if OK
 *
 *  Baud Rate: 115200
 *  Sampling Rate: ~250 Hz
 */

// ─── Pin Definitions ─────────────────────────────────
const int ECG_PIN    = A0;   // AD8232 OUTPUT pin
const int LO_PLUS    = 10;   // AD8232 LO+ (Leads Off+)
const int LO_MINUS   = 11;   // AD8232 LO- (Leads Off-)
const int LED_PIN    = 13;   // Onboard LED for heartbeat

// ─── Configuration ───────────────────────────────────
const unsigned long SAMPLE_INTERVAL_US = 4000;  // 4ms = 250Hz
const unsigned long BAUD_RATE = 115200;

// ─── Variables ───────────────────────────────────────
unsigned long lastSampleTime = 0;
int ecgValue = 0;
bool leadsOff = false;
int peakValue = 0;
int troughValue = 1023;
bool ledState = false;
int lastValue = 512;
int threshold = 600;
unsigned long lastBeatTime = 0;

// ─── Adaptive Threshold ─────────────────────────────
int adaptiveHigh = 600;
int adaptiveLow = 400;
const float DECAY_FACTOR = 0.995;

void setup() {
  // Initialize Serial (UART)
  Serial.begin(BAUD_RATE);
  
  // Configure pins
  pinMode(LO_PLUS, INPUT);
  pinMode(LO_MINUS, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(ECG_PIN, INPUT);
  
  // Startup message
  Serial.println("AD8232_ECG_INIT");
  Serial.println("FORMAT:value,leadOff");
  Serial.println("RATE:250Hz");
  Serial.println("---");
  
  // Allow sensor to stabilize
  delay(1000);
  
  lastSampleTime = micros();
}

void loop() {
  unsigned long currentTime = micros();
  
  // Precise timing for consistent sampling rate
  if (currentTime - lastSampleTime >= SAMPLE_INTERVAL_US) {
    lastSampleTime += SAMPLE_INTERVAL_US;
    
    // Check leads-off detection
    leadsOff = (digitalRead(LO_PLUS) == 1) || 
               (digitalRead(LO_MINUS) == 1);
    
    // Read ECG analog value (10-bit: 0-1023)
    ecgValue = analogRead(ECG_PIN);
    
    // ─── Beat Detection (for LED) ──────────────
    if (!leadsOff) {
      // Update adaptive threshold
      if (ecgValue > adaptiveHigh) {
        adaptiveHigh = ecgValue;
      }
      if (ecgValue < adaptiveLow) {
        adaptiveLow = ecgValue;
      }
      
      // Decay thresholds
      adaptiveHigh *= DECAY_FACTOR;
      adaptiveLow = adaptiveLow + (1 - DECAY_FACTOR) * 
                     (512 - adaptiveLow);
      
      // Calculate dynamic threshold
      threshold = (adaptiveHigh + adaptiveLow) / 2 + 
                  (adaptiveHigh - adaptiveLow) * 0.3;
      
      // Rising edge detection
      if (ecgValue > threshold && lastValue <= threshold) {
        unsigned long beatInterval = currentTime - lastBeatTime;
        
        // Debounce: minimum 300ms between beats (200 BPM max)
        if (beatInterval > 300000) {
          lastBeatTime = currentTime;
          digitalWrite(LED_PIN, HIGH);
          ledState = true;
        }
      }
      
      // Turn off LED after 50ms
      if (ledState && (currentTime - lastBeatTime > 50000)) {
        digitalWrite(LED_PIN, LOW);
        ledState = false;
      }
    } else {
      // Leads off - blink LED as warning
      if ((currentTime / 500000) % 2 == 0) {
        digitalWrite(LED_PIN, HIGH);
      } else {
        digitalWrite(LED_PIN, LOW);
      }
    }
    
    lastValue = ecgValue;
    
    // ─── Send Data via UART ────────────────────
    // Format: "value,leadOff\n"
    Serial.print(ecgValue);
    Serial.print(',');
    Serial.println(leadsOff ? 1 : 0);
  }
}
