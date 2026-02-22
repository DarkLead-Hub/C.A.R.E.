import { useState, useCallback, useRef } from "react";
import {
  Heart,
  Activity,
  Zap,
  BarChart3,
  Cpu,
  Waves,
} from "lucide-react";
import { ECGCanvas } from "./components/ecg-canvas";
import { StatCard } from "./components/stat-card";
import { SignalQualityGauge } from "./components/signal-quality-gauge";
import { ConnectionPanel } from "./components/connection-panel";
import { HRVPanel } from "./components/hrv-panel";
import { SignalStatsPanel } from "./components/signal-stats-panel";
import {
  BpmTrendChart,
  RRHistogramChart,
  FrequencyChart,
} from "./components/dashboard-charts";
import { PatientSelector } from "./components/patient-selector";
import { UploadToast } from "./components/upload-toast";
import { useSerial } from "./components/use-serial";
import { useECGProcessor } from "./components/use-ecg-processor";
import { useIPFS } from "./components/use-ipfs";
import type { ECGDataPoint } from "./components/use-serial";

export default function App() {
  const [baudRate, setBaudRate] = useState(115200);
  const [isCapturing, setIsCapturing] = useState(false);
  const isCapturingRef = useRef(false);
  const captureBufferRef = useRef<ECGDataPoint[]>([]);

  const {
    stats,
    waveformData,
    bpmTrend,
    rrHistogram,
    frequencyData,
    addDataPoint,
    reset,
  } = useECGProcessor();

  const ipfs = useIPFS();

  const handleData = useCallback(
    (point: ECGDataPoint) => {
      addDataPoint(point);
      if (isCapturingRef.current) {
        captureBufferRef.current.push(point);
      }
    },
    [addDataPoint]
  );

  const serial = useSerial(handleData);

  const handleConnect = () => serial.connect(baudRate);
  const handleDisconnect = () => serial.disconnect();
  const handleReset = () => {
    reset();
  };

  const handleCaptureAndUpload = async () => {
    if (!ipfs.selectedPatient) return;

    setIsCapturing(true);
    isCapturingRef.current = true;
    captureBufferRef.current = [];

    setTimeout(async () => {
      setIsCapturing(false);
      isCapturingRef.current = false;
      const dataToUpload = [...captureBufferRef.current];
      await ipfs.uploadECG(dataToUpload);
    }, 5000);
  };

  const isActive = serial.isConnected;
  const canCapture = isActive && !!ipfs.selectedPatient && !isCapturing && !ipfs.isUploading;

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "linear-gradient(135deg, #0a0e1a 0%, #0d1117 25%, #0a0e1a 50%, #111827 100%)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Ambient background effects */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,255,136,0.03), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(0,100,255,0.02), transparent)",
        }}
      />

      <div className="relative z-10 p-4 lg:p-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <h1
              style={{
                color: "#ffffff",
                fontSize: "20px",
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              IoMT{" "}
              <span style={{ color: "#00ff88" }}>Edge</span>{" "}
              Dashboard
            </h1>
          </div>

          {/* Right side status indicators */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleCaptureAndUpload}
              disabled={!canCapture}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all"
              style={{
                background: isCapturing
                  ? "#ffbb00"
                  : ipfs.isUploading
                    ? "#aa55ff"
                    : canCapture
                      ? "#00ff88"
                      : "rgba(255,255,255,0.1)",
                color:
                  isCapturing || ipfs.isUploading || canCapture
                    ? "#0a0e1a"
                    : "rgba(255,255,255,0.4)",
                fontSize: "12px",
                fontFamily: "JetBrains Mono, monospace",
                border: "none",
                cursor: !canCapture ? "not-allowed" : "pointer",
                boxShadow: canCapture
                  ? "0 0 15px rgba(0,255,136,0.3)"
                  : "none",
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              {isCapturing
                ? "Capturing 5s..."
                : ipfs.isUploading
                  ? "Uploading..."
                  : !ipfs.selectedPatient
                    ? "Select Patient"
                    : "Capture to IPFS"}
            </button>
            {isActive && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#00ff88",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                  <span
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "10px",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    LIVE
                  </span>
                </div>
                <span
                  style={{
                    color: "rgba(255,255,255,0.25)",
                    fontSize: "10px",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  250Hz • 10-bit ADC
                </span>
              </div>
            )}
            <div
              className="px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "10px",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                UART {baudRate} baud
              </span>
            </div>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left sidebar - Connection + Controls */}
          <div className="lg:col-span-2 space-y-4">
            <ConnectionPanel
              isConnected={serial.isConnected}
              isConnecting={serial.isConnecting}
              isDemoRunning={false}
              error={serial.error}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onDemoStart={() => { }}
              onDemoStop={() => { }}
              onReset={handleReset}
              baudRate={baudRate}
              onBaudRateChange={setBaudRate}
            />

            {/* Patient Selector */}
            <PatientSelector
              patients={ipfs.patients}
              selectedPatient={ipfs.selectedPatient}
              onSelect={ipfs.setSelectedPatient}
              isLoading={ipfs.isLoadingPatients}
              error={ipfs.error}
              onRefresh={ipfs.fetchPatients}
            />

            {/* Signal Quality */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h3
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.15em",
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                SIGNAL QUALITY
              </h3>
              <SignalQualityGauge quality={stats.signalQuality} />
            </div>

            {/* Lead placement diagram */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h3
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.15em",
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                LEAD PLACEMENT
              </h3>
              <div className="flex flex-col items-center gap-2">
                {/* Simple body diagram */}
                <svg
                  width="100"
                  height="130"
                  viewBox="0 0 100 130"
                  fill="none"
                >
                  {/* Head */}
                  <circle
                    cx="50"
                    cy="18"
                    r="12"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1.5"
                  />
                  {/* Body */}
                  <line
                    x1="50"
                    y1="30"
                    x2="50"
                    y2="80"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1.5"
                  />
                  {/* Arms */}
                  <line
                    x1="50"
                    y1="45"
                    x2="15"
                    y2="65"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="50"
                    y1="45"
                    x2="85"
                    y2="65"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1.5"
                  />
                  {/* Legs */}
                  <line
                    x1="50"
                    y1="80"
                    x2="30"
                    y2="120"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="50"
                    y1="80"
                    x2="70"
                    y2="120"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1.5"
                  />

                  {/* RA electrode */}
                  <circle
                    cx="28"
                    cy="38"
                    r="5"
                    fill="rgba(255,68,68,0.3)"
                    stroke="#ff4444"
                    strokeWidth="1.5"
                  />
                  <text
                    x="12"
                    y="34"
                    fill="#ff4444"
                    style={{
                      fontSize: "8px",
                      fontFamily: "JetBrains Mono",
                      fontWeight: 700,
                    }}
                  >
                    RA
                  </text>

                  {/* LA electrode */}
                  <circle
                    cx="72"
                    cy="38"
                    r="5"
                    fill="rgba(255,200,0,0.3)"
                    stroke="#ffc800"
                    strokeWidth="1.5"
                  />
                  <text
                    x="80"
                    y="34"
                    fill="#ffc800"
                    style={{
                      fontSize: "8px",
                      fontFamily: "JetBrains Mono",
                      fontWeight: 700,
                    }}
                  >
                    LA
                  </text>

                  {/* RL electrode */}
                  <circle
                    cx="62"
                    cy="95"
                    r="5"
                    fill="rgba(0,255,136,0.3)"
                    stroke="#00ff88"
                    strokeWidth="1.5"
                  />
                  <text
                    x="72"
                    y="99"
                    fill="#00ff88"
                    style={{
                      fontSize: "8px",
                      fontFamily: "JetBrains Mono",
                      fontWeight: 700,
                    }}
                  >
                    RL
                  </text>
                </svg>

                <div className="flex flex-col gap-1 w-full">
                  {[
                    { label: "RA", desc: "Right Arm", color: "#ff4444" },
                    { label: "LA", desc: "Left Arm", color: "#ffc800" },
                    { label: "RL", desc: "Right Leg (Ref)", color: "#00ff88" },
                  ].map((lead) => (
                    <div
                      key={lead.label}
                      className="flex items-center gap-2 px-2 py-1"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: lead.color }}
                      />
                      <span
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: "9px",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        <span
                          style={{
                            color: lead.color,
                            fontWeight: 700,
                          }}
                        >
                          {lead.label}
                        </span>{" "}
                        {lead.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Center - Main content */}
          <div className="lg:col-span-7 space-y-4">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                title="Heart Rate"
                value={stats.bpm || "—"}
                unit="BPM"
                icon={<Heart className="w-3.5 h-3.5" />}
                color="#ff4488"
                subtitle={`Avg: ${stats.avgBpm || "—"}`}
                trend={
                  stats.bpm > stats.avgBpm + 5
                    ? "up"
                    : stats.bpm < stats.avgBpm - 5
                      ? "down"
                      : "stable"
                }
              />
              <StatCard
                title="HRV (SDNN)"
                value={stats.sdnn || "—"}
                unit="ms"
                icon={<Waves className="w-3.5 h-3.5" />}
                color="#00c8ff"
                subtitle={`RMSSD: ${stats.rmssd || "—"}ms`}
              />
              <StatCard
                title="BPM Range"
                value={
                  stats.minBpm
                    ? `${stats.minBpm}-${stats.maxBpm}`
                    : "—"
                }
                unit="BPM"
                icon={<BarChart3 className="w-3.5 h-3.5" />}
                color="#ffaa00"
                subtitle={`Δ ${stats.maxBpm - stats.minBpm || 0}`}
              />
              <StatCard
                title="Total Beats"
                value={stats.totalBeats || "—"}
                unit=""
                icon={<Zap className="w-3.5 h-3.5" />}
                color="#aa55ff"
                subtitle={`Session: ${formatTime(stats.sessionDuration)}`}
              />
            </div>

            {/* Main ECG Waveform */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(0, 255, 136, 0.1)",
                boxShadow:
                  isActive
                    ? "0 0 40px rgba(0, 255, 136, 0.05), inset 0 1px 0 rgba(255,255,255,0.05)"
                    : "inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Activity
                    className="w-4 h-4"
                    style={{ color: "#00ff88" }}
                  />
                  <span
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: "11px",
                      fontFamily: "JetBrains Mono, monospace",
                      fontWeight: 600,
                      letterSpacing: "0.15em",
                    }}
                  >
                    LEAD I — REAL-TIME ECG WAVEFORM
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    style={{
                      color: "rgba(255,255,255,0.25)",
                      fontSize: "10px",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    25mm/s • 10mm/mV
                  </span>
                  {isActive && (
                    <span
                      className="flex items-center gap-1"
                      style={{
                        color: "#00ff88",
                        fontSize: "10px",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "#00ff88",
                          animation: "pulse 1s infinite",
                        }}
                      />
                      RECORDING
                    </span>
                  )}
                </div>
              </div>
              <div style={{ height: 280, padding: "0 8px 8px" }}>
                {waveformData.length > 0 ? (
                  <ECGCanvas data={waveformData} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Activity
                        className="w-12 h-12 mx-auto mb-3"
                        style={{ color: "rgba(255,255,255,0.1)" }}
                      />
                      <p
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          fontSize: "13px",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        Connect your AD8232 or start Demo Mode
                      </p>
                      <p
                        style={{
                          color: "rgba(255,255,255,0.15)",
                          fontSize: "11px",
                          fontFamily: "JetBrains Mono, monospace",
                          marginTop: 4,
                        }}
                      >
                        Waiting for serial data on UART...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BpmTrendChart data={bpmTrend} />
              <RRHistogramChart data={rrHistogram} />
            </div>

            {/* Frequency analysis */}
            <FrequencyChart data={frequencyData} />

          </div>

          {/* Right sidebar - Analytics */}
          <div className="lg:col-span-3 space-y-4">
            {/* HRV Panel */}
            <HRVPanel stats={stats} />

            {/* Signal Stats */}
            <SignalStatsPanel stats={stats} />

            {/* Vital Signs Summary */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h3
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.15em",
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                SYSTEM INFO
              </h3>
              <p
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: "10px",
                  fontFamily: "JetBrains Mono, monospace",
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                Hardware & protocol details
              </p>

              <div className="space-y-2">
                {[
                  {
                    label: "Sensor",
                    value: "AD8232",
                    icon: <Cpu className="w-3 h-3" />,
                  },
                  {
                    label: "Protocol",
                    value: "UART Serial",
                    icon: <Zap className="w-3 h-3" />,
                  },
                  {
                    label: "ADC",
                    value: "10-bit (0-1023)",
                    icon: <BarChart3 className="w-3 h-3" />,
                  },
                  {
                    label: "Sample Rate",
                    value: "250 Hz",
                    icon: <Activity className="w-3 h-3" />,
                  },
                  {
                    label: "Leads",
                    value: "3 (RA, LA, RL)",
                    icon: <Heart className="w-3 h-3" />,
                  },
                  {
                    label: "Baud Rate",
                    value: `${baudRate}`,
                    icon: <Waves className="w-3 h-3" />,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: "rgba(255,255,255,0.25)" }}>
                        {item.icon}
                      </span>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "10px",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "10px",
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: 600,
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer
          className="mt-6 pt-4 flex items-center justify-between"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: "10px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            AD8232 ECG Monitor v1.0 • Web Serial API • Chrome/Edge Required
          </span>
          <span
            style={{
              color: "rgba(255,255,255,0.15)",
              fontSize: "10px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            ⚠ For educational purposes only — not a medical device
          </span>
        </footer>
      </div>

      {/* Global CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Upload Toast */}
      {ipfs.uploadResult && (
        <UploadToast
          result={ipfs.uploadResult}
          onClose={ipfs.clearUploadResult}
        />
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}