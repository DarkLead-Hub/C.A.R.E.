import { useRef, useEffect, useCallback } from "react";

interface ECGCanvasProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  gridColor?: string;
  showGrid?: boolean;
  lineWidth?: number;
}

export function ECGCanvas({
  data,
  color = "#00ff88",
  gridColor = "rgba(0, 255, 136, 0.06)",
  showGrid = true,
  lineWidth = 2,
}: ECGCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;

      // Major grid
      const gridSpacing = 25;
      for (let x = 0; x < w; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Sub-grid
      ctx.strokeStyle = gridColor.replace(/[\d.]+\)$/, (match) => `${parseFloat(match) * 0.5})`);
      ctx.lineWidth = 0.3;
      const subGrid = gridSpacing / 5;
      for (let x = 0; x < w; x += subGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += subGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    if (data.length < 2) return;

    // Determine visible range
    const pointsToShow = Math.min(data.length, Math.floor(w * 1.5));
    const startIdx = Math.max(0, data.length - pointsToShow);
    const visibleData = data.slice(startIdx);

    // Auto-scale Y axis
    let min = Infinity,
      max = -Infinity;
    for (const v of visibleData) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1;
    const padding = range * 0.15;
    const yMin = min - padding;
    const yMax = max + padding;

    const xStep = w / (pointsToShow - 1);

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    for (let i = 0; i < visibleData.length; i++) {
      const x = i * xStep;
      const y = h - ((visibleData[i] - yMin) / (yMax - yMin)) * h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Second pass for sharper line
    ctx.shadowBlur = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth * 0.6;
    ctx.globalAlpha = 0.9;

    ctx.beginPath();
    for (let i = 0; i < visibleData.length; i++) {
      const x = i * xStep;
      const y = h - ((visibleData[i] - yMin) / (yMax - yMin)) * h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Leading dot
    if (visibleData.length > 0) {
      const lastX = (visibleData.length - 1) * xStep;
      const lastY =
        h -
        ((visibleData[visibleData.length - 1] - yMin) / (yMax - yMin)) * h;

      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scale labels
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(yMax)}`, w - 5, 12);
    ctx.fillText(`${Math.round(yMin)}`, w - 5, h - 5);
    ctx.fillText(`${Math.round((yMax + yMin) / 2)}`, w - 5, h / 2);
  }, [data, color, gridColor, showGrid, lineWidth]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: 200 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
