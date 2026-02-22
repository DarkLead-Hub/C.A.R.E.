import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { BpmTrendPoint, RRHistogramBin } from "./use-ecg-processor";

interface BpmTrendChartProps {
  data: BpmTrendPoint[];
}

export function BpmTrendChart({ data }: BpmTrendChartProps) {
  return (
    <ChartWrapper title="BPM TREND" subtitle="Heart rate over time">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="bpmGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff4488" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ff4488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
          />
          <XAxis
            dataKey="time"
            stroke="rgba(255,255,255,0.2)"
            tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickFormatter={(v) => `${v}s`}
          />
          <YAxis
            stroke="rgba(255,255,255,0.2)"
            tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
            domain={["dataMin - 5", "dataMax + 5"]}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255, 68, 136, 0.3)",
              borderRadius: "8px",
              fontSize: "12px",
              fontFamily: "JetBrains Mono",
              color: "#fff",
            }}
            formatter={(value: number) => [`${value} BPM`, "Heart Rate"]}
            labelFormatter={(label) => `Time: ${label}s`}
          />
          <Area
            type="monotone"
            dataKey="bpm"
            stroke="#ff4488"
            strokeWidth={2}
            fill="url(#bpmGradient)"
            dot={false}
            animationDuration={200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

interface RRHistogramChartProps {
  data: RRHistogramBin[];
}

export function RRHistogramChart({ data }: RRHistogramChartProps) {
  return (
    <ChartWrapper title="RR INTERVAL DISTRIBUTION" subtitle="Histogram of R-R intervals">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
          />
          <XAxis
            dataKey="range"
            stroke="rgba(255,255,255,0.2)"
            tick={{ fontSize: 9, fontFamily: "JetBrains Mono" }}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            stroke="rgba(255,255,255,0.2)"
            tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(0, 200, 255, 0.3)",
              borderRadius: "8px",
              fontSize: "12px",
              fontFamily: "JetBrains Mono",
              color: "#fff",
            }}
            formatter={(value: number) => [`${value}`, "Count"]}
            labelFormatter={(label) => `Interval: ${label}ms`}
          />
          <Bar
            dataKey="count"
            fill="#00c8ff"
            radius={[4, 4, 0, 0]}
            animationDuration={200}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

interface FrequencyChartProps {
  data: { freq: number; power: number }[];
}

export function FrequencyChart({ data }: FrequencyChartProps) {
  return (
    <ChartWrapper
      title="FREQUENCY DOMAIN (PSD)"
      subtitle="Power spectral density analysis"
    >
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="freqGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#aa55ff" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#aa55ff" stopOpacity={0} />
            </linearGradient>
            {/* LF band marker */}
            <linearGradient id="lfBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffaa00" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#ffaa00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
          />
          <XAxis
            dataKey="freq"
            stroke="rgba(255,255,255,0.2)"
            tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickFormatter={(v) => `${v}Hz`}
          />
          <YAxis
            stroke="rgba(255,255,255,0.2)"
            tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(170, 85, 255, 0.3)",
              borderRadius: "8px",
              fontSize: "12px",
              fontFamily: "JetBrains Mono",
              color: "#fff",
            }}
            formatter={(value: number) => [`${value}`, "Power"]}
            labelFormatter={(label) => `Freq: ${label}Hz`}
          />
          <Area
            type="monotone"
            dataKey="power"
            stroke="#aa55ff"
            strokeWidth={1.5}
            fill="url(#freqGradient)"
            dot={false}
            animationDuration={200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// Wrapper component
function ChartWrapper({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(15, 23, 42, 0.8)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mb-3">
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
          {title}
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
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}