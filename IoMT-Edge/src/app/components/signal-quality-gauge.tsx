interface SignalQualityGaugeProps {
  quality: number; // 0-100
}

export function SignalQualityGauge({ quality }: SignalQualityGaugeProps) {
  const getColor = (q: number) => {
    if (q >= 80) return "#00ff88";
    if (q >= 50) return "#ffaa00";
    return "#ff4444";
  };

  const getLabel = (q: number) => {
    if (q >= 80) return "EXCELLENT";
    if (q >= 60) return "GOOD";
    if (q >= 40) return "FAIR";
    if (q >= 20) return "POOR";
    return "NO SIGNAL";
  };

  const color = getColor(quality);
  const label = getLabel(quality);

  // SVG arc gauge
  const radius = 60;
  const strokeWidth = 8;
  const center = 70;
  const startAngle = -225;
  const endAngle = 45;
  const totalAngle = endAngle - startAngle;
  const progressAngle = startAngle + (quality / 100) * totalAngle;

  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleDeg: number
  ) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    start: number,
    end: number
  ) => {
    const s = polarToCartesian(cx, cy, r, start);
    const e = polarToCartesian(cx, cy, r, end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="110" viewBox="0 0 140 110">
        <defs>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={describeArc(center, center, radius, startAngle, endAngle)}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        {quality > 0 && (
          <path
            d={describeArc(center, center, radius, startAngle, progressAngle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
            style={{
              transition: "all 0.5s ease",
            }}
          />
        )}

        {/* Value text */}
        <text
          x={center}
          y={center - 5}
          textAnchor="middle"
          fill={color}
          style={{
            fontSize: "26px",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 700,
          }}
        >
          {quality}
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          style={{
            fontSize: "8px",
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.15em",
          }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
