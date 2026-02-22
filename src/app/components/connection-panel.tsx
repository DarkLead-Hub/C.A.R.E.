import {
  Usb,
  Play,
  Square,
  RotateCcw,
} from "lucide-react";

interface ConnectionPanelProps {
  isConnected: boolean;
  isConnecting: boolean;
  isDemoRunning: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onDemoStart: () => void;
  onDemoStop: () => void;
  onReset: () => void;
  baudRate: number;
  onBaudRateChange: (rate: number) => void;
}

export function ConnectionPanel({
  isConnected,
  isConnecting,
  isDemoRunning,
  error,
  onConnect,
  onDisconnect,
  onDemoStart,
  onDemoStop,
  onReset,
  baudRate,
  onBaudRateChange,
}: ConnectionPanelProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(15, 23, 42, 0.8)",
        border: `1px solid ${isConnected
            ? "rgba(0, 255, 136, 0.2)"
            : isDemoRunning
              ? "rgba(0, 200, 255, 0.2)"
              : "rgba(255,255,255,0.06)"
          }`,
      }}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: isConnected
              ? "#00ff88"
              : isDemoRunning
                ? "#00c8ff"
                : "#ff4444",
            boxShadow: isConnected
              ? "0 0 8px #00ff88"
              : isDemoRunning
                ? "0 0 8px #00c8ff"
                : "0 0 8px #ff4444",
            animation:
              isConnected || isDemoRunning ? "pulse 2s infinite" : "none",
          }}
        />
        <span
          style={{
            color: isConnected
              ? "#00ff88"
              : isDemoRunning
                ? "#00c8ff"
                : "rgba(255,255,255,0.5)",
            fontSize: "11px",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 600,
            letterSpacing: "0.1em",
          }}
        >
          {isConnected
            ? "SERIAL CONNECTED"
            : isDemoRunning
              ? "DEMO MODE ACTIVE"
              : isConnecting
                ? "CONNECTING..."
                : "DISCONNECTED"}
        </span>
      </div>

      {/* Baud rate selector */}
      {!isConnected && !isDemoRunning && (
        <div className="flex items-center gap-2 mb-3">
          <span
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "10px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            BAUD:
          </span>
          <select
            value={baudRate}
            onChange={(e) => onBaudRateChange(Number(e.target.value))}
            className="rounded px-2 py-1"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
              fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            <option value={9600}>9600</option>
            <option value={19200}>19200</option>
            <option value={38400}>38400</option>
            <option value={57600}>57600</option>
            <option value={115200}>115200</option>
            <option value={230400}>230400</option>
          </select>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {!isConnected && !isDemoRunning && (
          <>
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center justify-center gap-2 w-full rounded-lg px-3 py-2.5 transition-all"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,255,136,0.05))",
                border: "1px solid rgba(0,255,136,0.3)",
                color: "#00ff88",
                fontSize: "12px",
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 600,
                opacity: isConnecting ? 0.5 : 1,
              }}
            >
              <Usb className="w-4 h-4" />
              Connect Serial
            </button>
          </>
        )}

        {(isConnected || isDemoRunning) && (
          <>
            <button
              onClick={isConnected ? onDisconnect : onDemoStop}
              className="flex items-center justify-center gap-2 w-full rounded-lg px-3 py-2.5 transition-all"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,68,68,0.15), rgba(255,68,68,0.05))",
                border: "1px solid rgba(255,68,68,0.3)",
                color: "#ff4444",
                fontSize: "12px",
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 600,
              }}
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
            <button
              onClick={onReset}
              className="flex items-center justify-center gap-2 w-full rounded-lg px-3 py-2.5 transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                fontSize: "12px",
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 600,
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Data
            </button>
          </>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div
          className="mt-3 rounded-lg px-3 py-2"
          style={{
            background: "rgba(255,68,68,0.1)",
            border: "1px solid rgba(255,68,68,0.2)",
          }}
        >
          <p
            style={{
              color: "#ff6666",
              fontSize: "10px",
              fontFamily: "JetBrains Mono, monospace",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {error}
          </p>
        </div>
      )}
    </div>
  );
}