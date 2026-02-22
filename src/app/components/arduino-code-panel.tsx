import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

const ARDUINO_CODE = `/*
 * ═══════════════════════════════════════════════════════
 *   AD8232 ECG Monitor - UART Serial Output
 *   3-Lead (LA, RA, RL) Configuration
 * ═══════════════════════════════════════════════════════
 *
 *  Wiring:
 *  ┌──────────┐     ┌───────────┐
 *  │ AD8232   │     │  Arduino  │
 *  │          │     │           │
 *  │ GND ─────┼─────┤ GND       │
 *  │ 3.3V ────┼─────┤ 3.3V      │
 *  │ OUTPUT ──┼─────┤ A0        │
 *  │ LO- ─────┼─────┤ D11       │
 *  │ LO+ ─────┼─────┤ D10       │
 *  │ SDN ─────┼─────┤ (NC)      │
 *  └──────────┘     └───────────┘
 *
 *  Electrode Placement (Einthoven Triangle):
 *  RA (Right Arm) → Right collarbone area
 *  LA (Left Arm)  → Left collarbone area
 *  RL (Right Leg)  → Right lower abdomen (Reference)
 *
 *  Serial Output Format: "value,leadOff\\n"
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
    // Format: "value,leadOff\\n"
    Serial.print(ecgValue);
    Serial.print(',');
    Serial.println(leadsOff ? 1 : 0);
  }
}`;

export function ArduinoCodePanel() {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ARDUINO_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(15, 23, 42, 0.8)",
        border: "1px solid rgba(0, 255, 136, 0.1)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "rgba(0, 255, 136, 0.03)",
          borderBottom: expanded
            ? "1px solid rgba(0, 255, 136, 0.1)"
            : "none",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#00979D" }}
          />
          <span
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "13px",
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 600,
            }}
          >
            ad8232_ecg_monitor.ino
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded transition-colors"
            style={{
              background: "rgba(0, 255, 136, 0.1)",
              color: copied ? "#00ff88" : "rgba(255,255,255,0.6)",
              fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
          {expanded ? (
            <ChevronUp
              className="w-4 h-4"
              style={{ color: "rgba(255,255,255,0.4)" }}
            />
          ) : (
            <ChevronDown
              className="w-4 h-4"
              style={{ color: "rgba(255,255,255,0.4)" }}
            />
          )}
        </div>
      </div>

      {expanded && (
        <div
          className="overflow-auto"
          style={{ maxHeight: 500 }}
        >
          <pre
            className="p-4 m-0"
            style={{
              color: "#e2e8f0",
              fontSize: "12px",
              fontFamily: "JetBrains Mono, monospace",
              lineHeight: 1.6,
              tabSize: 2,
            }}
          >
            <code>{ARDUINO_CODE}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
