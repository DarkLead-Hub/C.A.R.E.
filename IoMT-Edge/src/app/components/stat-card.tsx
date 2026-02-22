import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  color?: string;
  subtitle?: string;
  trend?: "up" | "down" | "stable";
  glowColor?: string;
}

export function StatCard({
  title,
  value,
  unit,
  icon,
  color = "#00ff88",
  subtitle,
  trend,
  glowColor,
}: StatCardProps) {
  const glow = glowColor || color;

  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: "rgba(15, 23, 42, 0.8)",
        border: `1px solid ${color}22`,
        boxShadow: `0 0 20px ${glow}08, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl"
        style={{ background: color }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span
            className="flex items-center gap-1.5 uppercase tracking-wider"
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "10px",
              letterSpacing: "0.1em",
            }}
          >
            <span style={{ color, opacity: 0.8 }}>{icon}</span>
            {title}
          </span>
          {trend && (
            <span
              style={{
                fontSize: "10px",
                color:
                  trend === "up"
                    ? "#00ff88"
                    : trend === "down"
                    ? "#ff4444"
                    : "#888",
              }}
            >
              {trend === "up" ? "▲" : trend === "down" ? "▼" : "●"}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1">
          <span
            className="tabular-nums"
            style={{
              color,
              fontSize: "28px",
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 700,
              textShadow: `0 0 20px ${glow}40`,
              lineHeight: 1.1,
            }}
          >
            {value}
          </span>
          {unit && (
            <span
              style={{
                color: `${color}88`,
                fontSize: "12px",
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 500,
              }}
            >
              {unit}
            </span>
          )}
        </div>

        {subtitle && (
          <p
            className="mt-1"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
