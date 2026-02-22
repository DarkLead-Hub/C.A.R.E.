import { useRef, useCallback, useState } from "react";
import type { ECGDataPoint } from "./use-serial";

export function useDemoMode(onData: (point: ECGDataPoint) => void) {
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const sampleRef = useRef(0);
  const startTimeRef = useRef(0);

  // Generate realistic ECG waveform (PQRST complex)
  const generateECG = useCallback((t: number): number => {
    const heartRate = 72 + Math.sin(t * 0.001) * 5; // Slight HR variation
    const period = 60000 / heartRate;
    const phase = (t % period) / period;

    let value = 512; // Baseline (10-bit ADC center)

    // P wave
    if (phase >= 0.0 && phase < 0.1) {
      const p = (phase - 0.0) / 0.1;
      value += 15 * Math.sin(p * Math.PI);
    }
    // PR segment
    else if (phase >= 0.1 && phase < 0.15) {
      value += 0;
    }
    // Q wave
    else if (phase >= 0.15 && phase < 0.18) {
      const q = (phase - 0.15) / 0.03;
      value -= 20 * Math.sin(q * Math.PI);
    }
    // R wave (sharp peak)
    else if (phase >= 0.18 && phase < 0.24) {
      const r = (phase - 0.18) / 0.06;
      value += 180 * Math.sin(r * Math.PI);
    }
    // S wave
    else if (phase >= 0.24 && phase < 0.28) {
      const s = (phase - 0.24) / 0.04;
      value -= 40 * Math.sin(s * Math.PI);
    }
    // ST segment
    else if (phase >= 0.28 && phase < 0.35) {
      value += 3;
    }
    // T wave
    else if (phase >= 0.35 && phase < 0.5) {
      const tw = (phase - 0.35) / 0.15;
      value += 30 * Math.sin(tw * Math.PI);
    }
    // baseline
    else {
      value += 0;
    }

    // Add realistic noise
    value += (Math.random() - 0.5) * 6;
    // Add slight baseline wander
    value += Math.sin(t * 0.0003) * 8;

    return Math.round(value);
  }, []);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    sampleRef.current = 0;
    setIsRunning(true);

    // Simulate ~250 Hz sampling
    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;

      for (let i = 0; i < 4; i++) {
        // batch 4 samples per tick
        sampleRef.current++;
        const t = elapsed + i * 4;
        const value = generateECG(t);
        onData({
          timestamp: t,
          value,
          leadOff: false,
        });
      }
    }, 16); // ~60fps, 4 samples each = ~240Hz
  }, [generateECG, onData]);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  return { isRunning, start, stop };
}
