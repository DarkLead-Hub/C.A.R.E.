import type { ECGStats } from "./use-ecg-processor";

interface HRVPanelProps {
  stats: ECGStats;
}

export function HRVPanel({ stats }: HRVPanelProps) {
  const metrics = [
    {
      label: "SDNN",
      value: stats.sdnn,
      unit: "ms",
      description: "Standard deviation of NN intervals",
      color: "#00ff88",
      normal: "50-100ms",
    },
    {
      label: "RMSSD",
      value: stats.rmssd,
      unit: "ms",
      description: "Root mean square of successive differences",
      color: "#00c8ff",
      normal: "20-50ms",
    },
    {
      label: "pNN50",
      value: stats.pnn50,
      unit: "%",
      description: "% of successive RR intervals > 50ms",
      color: "#aa55ff",
      normal: "5-25%",
    },
    {
      label: "LF/HF",
      value: stats.lfHfRatio,
      unit: "",
      description: "Low freq / High freq power ratio",
      color: "#ffaa00",
      normal: "1.5-2.0",
    },
  ];

  return (
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
        HRV ANALYSIS
      </h3>
      <p
        style={{
          color: "rgba(255,255,255,0.3)",
          fontSize: "10px",
          fontFamily: "JetBrains Mono, monospace",
          margin: 0,
          marginBottom: 16,
        }}
      >
        Heart rate variability metrics
      </p>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg p-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${m.color}15`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                style={{
                  color: m.color,
                  fontSize: "10px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                {m.label}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.2)",
                  fontSize: "8px",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                N: {m.normal}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                style={{
                  color: "#fff",
                  fontSize: "22px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {m.value}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "10px",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {m.unit}
              </span>
            </div>
            <p
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: "8px",
                fontFamily: "JetBrains Mono, monospace",
                margin: 0,
                marginTop: 4,
                lineHeight: 1.3,
              }}
            >
              {m.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
