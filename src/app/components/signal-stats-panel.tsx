import type { ECGStats } from "./use-ecg-processor";

interface SignalStatsPanelProps {
  stats: ECGStats;
}

export function SignalStatsPanel({ stats }: SignalStatsPanelProps) {
  const rows = [
    { label: "Min Value", value: stats.signalMin, color: "#00c8ff" },
    { label: "Max Value", value: stats.signalMax, color: "#ff4488" },
    { label: "Mean", value: stats.signalMean, color: "#00ff88" },
    { label: "Std Dev", value: stats.signalStdDev, color: "#ffaa00" },
    { label: "LF Power", value: `${stats.lfPower} ms²`, color: "#aa55ff" },
    { label: "HF Power", value: `${stats.hfPower} ms²`, color: "#55aaff" },
    {
      label: "Resp. Rate",
      value: stats.respiratoryRate > 0 ? `~${stats.respiratoryRate} /min` : "—",
      color: "#88ff55",
    },
    { label: "Total Beats", value: stats.totalBeats, color: "#ff8844" },
  ];

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(15, 23, 42, 0.8)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
              letterSpacing: "0.15em",
              fontWeight: 600,
              margin: 0,
            }}
          >
            SIGNAL ANALYTICS
          </h3>
          <p
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: "10px",
              fontFamily: "JetBrains Mono, monospace",
              margin: 0,
              marginTop: 2,
            }}
          >
            Raw signal statistics
          </p>
        </div>
        <div
          className="px-2 py-1 rounded"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "10px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            ⏱ {formatDuration(stats.sessionDuration)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: row.color }}
              />
              <span
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {row.label}
              </span>
            </div>
            <span
              className="tabular-nums"
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "12px",
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 600,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
