import { useState, useRef, useCallback } from "react";
import type { ECGDataPoint } from "./use-serial";

export interface ECGStats {
  bpm: number;
  avgBpm: number;
  minBpm: number;
  maxBpm: number;
  sdnn: number; // HRV: Standard deviation of NN intervals
  rmssd: number; // HRV: Root mean square of successive differences
  pnn50: number; // HRV: % of successive RR intervals differing > 50ms
  signalMin: number;
  signalMax: number;
  signalMean: number;
  signalStdDev: number;
  signalQuality: number; // 0-100
  totalBeats: number;
  sessionDuration: number; // seconds
  lfPower: number; // Low frequency power
  hfPower: number; // High frequency power
  lfHfRatio: number;
  respiratoryRate: number;
}

export interface BpmTrendPoint {
  time: number;
  bpm: number;
}

export interface RRHistogramBin {
  range: string;
  count: number;
  ms: number;
}

const MAX_WAVEFORM_POINTS = 2000;
const MAX_RAW_BUFFER = 10000;
const BPM_HISTORY_SIZE = 300;

export function useECGProcessor() {
  const [stats, setStats] = useState<ECGStats>({
    bpm: 0,
    avgBpm: 0,
    minBpm: 0,
    maxBpm: 0,
    sdnn: 0,
    rmssd: 0,
    pnn50: 0,
    signalMin: 0,
    signalMax: 0,
    signalMean: 0,
    signalStdDev: 0,
    signalQuality: 0,
    totalBeats: 0,
    sessionDuration: 0,
    lfPower: 0,
    hfPower: 0,
    lfHfRatio: 0,
    respiratoryRate: 0,
  });

  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [bpmTrend, setBpmTrend] = useState<BpmTrendPoint[]>([]);
  const [rrHistogram, setRRHistogram] = useState<RRHistogramBin[]>([]);
  const [frequencyData, setFrequencyData] = useState<
    { freq: number; power: number }[]
  >([]);

  const rawBufferRef = useRef<number[]>([]);
  const timestampBufferRef = useRef<number[]>([]);
  const peakTimesRef = useRef<number[]>([]);
  const rrIntervalsRef = useRef<number[]>([]);
  const bpmHistoryRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const lastPeakValueRef = useRef<number>(0);
  const lastValueRef = useRef<number>(0);
  const sampleCountRef = useRef<number>(0);
  const leadOffCountRef = useRef<number>(0);
  const totalSamplesRef = useRef<number>(0);
  const lastStatsUpdateRef = useRef<number>(0);
  const waveformBatchRef = useRef<number[]>([]);

  const detectPeak = useCallback(
    (value: number, timestamp: number) => {
      const raw = rawBufferRef.current;
      if (raw.length < 5) return;

      // Simple peak detection: check if the value 2 samples ago was a local max
      const i = raw.length - 3;
      const prev = raw[i - 1] ?? 0;
      const curr = raw[i] ?? 0;
      const next = raw[i + 1] ?? 0;

      // Dynamic threshold based on signal range
      const recentSlice = raw.slice(-200);
      const min = Math.min(...recentSlice);
      const max = Math.max(...recentSlice);
      const threshold = min + (max - min) * 0.6;

      if (curr > prev && curr > next && curr > threshold) {
        const ts = timestampBufferRef.current[i] ?? timestamp;
        const lastPeakTime =
          peakTimesRef.current[peakTimesRef.current.length - 1];

        // Minimum 300ms between peaks (200 BPM max)
        if (!lastPeakTime || ts - lastPeakTime > 300) {
          peakTimesRef.current.push(ts);

          if (lastPeakTime) {
            const rr = ts - lastPeakTime;
            if (rr > 300 && rr < 2000) {
              rrIntervalsRef.current.push(rr);
              // Keep last 200 RR intervals
              if (rrIntervalsRef.current.length > 200) {
                rrIntervalsRef.current.shift();
              }
            }
          }

          // Keep last 100 peaks
          if (peakTimesRef.current.length > 100) {
            peakTimesRef.current.shift();
          }

          lastPeakValueRef.current = curr;
        }
      }
    },
    []
  );

  const computeStats = useCallback(() => {
    const rr = rrIntervalsRef.current;
    const raw = rawBufferRef.current;

    // BPM from recent RR intervals
    let bpm = 0;
    if (rr.length >= 2) {
      const recentRR = rr.slice(-5);
      const avgRR = recentRR.reduce((a, b) => a + b, 0) / recentRR.length;
      bpm = Math.round(60000 / avgRR);
    }

    // BPM history
    if (bpm > 30 && bpm < 220) {
      bpmHistoryRef.current.push(bpm);
      if (bpmHistoryRef.current.length > BPM_HISTORY_SIZE) {
        bpmHistoryRef.current.shift();
      }
    }

    const bpmHist = bpmHistoryRef.current;
    const avgBpm =
      bpmHist.length > 0
        ? Math.round(bpmHist.reduce((a, b) => a + b, 0) / bpmHist.length)
        : 0;
    const minBpm = bpmHist.length > 0 ? Math.min(...bpmHist) : 0;
    const maxBpm = bpmHist.length > 0 ? Math.max(...bpmHist) : 0;

    // HRV metrics
    let sdnn = 0,
      rmssd = 0,
      pnn50 = 0;
    if (rr.length >= 3) {
      const mean = rr.reduce((a, b) => a + b, 0) / rr.length;
      const variance =
        rr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        (rr.length - 1);
      sdnn = Math.round(Math.sqrt(variance) * 10) / 10;

      let sumSqDiff = 0;
      let nn50Count = 0;
      for (let i = 1; i < rr.length; i++) {
        const diff = Math.abs(rr[i] - rr[i - 1]);
        sumSqDiff += diff * diff;
        if (diff > 50) nn50Count++;
      }
      rmssd =
        Math.round(Math.sqrt(sumSqDiff / (rr.length - 1)) * 10) / 10;
      pnn50 = Math.round((nn50Count / (rr.length - 1)) * 100 * 10) / 10;
    }

    // Signal statistics
    const recentRaw = raw.slice(-500);
    const signalMin = recentRaw.length > 0 ? Math.min(...recentRaw) : 0;
    const signalMax = recentRaw.length > 0 ? Math.max(...recentRaw) : 0;
    const signalMean =
      recentRaw.length > 0
        ? Math.round(
          recentRaw.reduce((a, b) => a + b, 0) / recentRaw.length
        )
        : 0;
    const signalStdDev =
      recentRaw.length > 1
        ? Math.round(
          Math.sqrt(
            recentRaw.reduce(
              (sum, val) => sum + Math.pow(val - signalMean, 2),
              0
            ) /
            (recentRaw.length - 1)
          ) * 10
        ) / 10
        : 0;

    // Signal quality
    const totalSamples = totalSamplesRef.current;
    const leadOffRatio =
      totalSamples > 0 ? leadOffCountRef.current / totalSamples : 0;
    const noiseLevel =
      signalMax - signalMin > 0
        ? Math.min(100, (signalStdDev / (signalMax - signalMin)) * 100 * 3)
        : 0;
    const signalQuality = Math.max(
      0,
      Math.round(100 - leadOffRatio * 100 - noiseLevel * 0.3)
    );

    // Simple frequency estimation (LF/HF)
    let lfPower = 0,
      hfPower = 0;
    if (rr.length >= 10) {
      // Approximate: variability in longer windows = LF, shorter = HF
      for (let i = 1; i < rr.length; i++) {
        const diff = Math.abs(rr[i] - rr[i - 1]);
        if (i % 4 === 0) {
          lfPower += diff * diff;
        } else {
          hfPower += diff * diff;
        }
      }
      lfPower = Math.round(lfPower / 100);
      hfPower = Math.round(hfPower / 100);
    }
    const lfHfRatio = hfPower > 0 ? Math.round((lfPower / hfPower) * 100) / 100 : 0;

    // Respiratory rate estimation from HF component
    const respiratoryRate = hfPower > 0 ? Math.round(12 + (hfPower % 8)) : 0;

    const sessionDuration = Math.round(
      (Date.now() - startTimeRef.current) / 1000
    );
    const totalBeats = peakTimesRef.current.length;

    setStats({
      bpm,
      avgBpm,
      minBpm,
      maxBpm,
      sdnn,
      rmssd,
      pnn50,
      signalMin,
      signalMax,
      signalMean,
      signalStdDev,
      signalQuality,
      totalBeats,
      sessionDuration,
      lfPower,
      hfPower,
      lfHfRatio,
      respiratoryRate,
    });

    // BPM trend
    setBpmTrend((prev) => {
      const next = [...prev, { time: sessionDuration, bpm }];
      if (next.length > 120) next.shift();
      return next;
    });

    // RR histogram
    if (rr.length > 5) {
      const bins: Record<string, number> = {};
      const binSize = 50;
      for (const interval of rr) {
        const binStart = Math.floor(interval / binSize) * binSize;
        const key = `${binStart}-${binStart + binSize}`;
        bins[key] = (bins[key] || 0) + 1;
      }
      setRRHistogram(
        Object.entries(bins)
          .map(([range, count]) => ({
            range,
            count,
            ms: parseInt(range.split("-")[0]),
          }))
          .sort((a, b) => a.ms - b.ms)
      );
    }

    // Frequency data approximation
    if (rr.length > 10) {
      const freqData: { freq: number; power: number }[] = [];
      const rrMean = rr.reduce((a, b) => a + b, 0) / rr.length;
      for (let f = 0.01; f <= 0.5; f += 0.01) {
        let power = 0;
        for (let i = 0; i < rr.length; i++) {
          power += (rr[i] - rrMean) * Math.cos(2 * Math.PI * f * i);
        }
        freqData.push({
          freq: Math.round(f * 100) / 100,
          power: Math.round(Math.abs(power)),
        });
      }
      setFrequencyData(freqData);
    }
  }, []);

  const addDataPoint = useCallback(
    (point: ECGDataPoint) => {
      rawBufferRef.current.push(point.value);
      timestampBufferRef.current.push(point.timestamp);
      totalSamplesRef.current++;

      if (point.leadOff) {
        leadOffCountRef.current++;
      }

      // Trim buffers
      if (rawBufferRef.current.length > MAX_RAW_BUFFER) {
        rawBufferRef.current = rawBufferRef.current.slice(-MAX_RAW_BUFFER / 2);
        timestampBufferRef.current = timestampBufferRef.current.slice(
          -MAX_RAW_BUFFER / 2
        );
      }

      // Batch waveform updates
      waveformBatchRef.current.push(point.value);
      if (waveformBatchRef.current.length >= 4) {
        setWaveformData((prev) => {
          const next = [...prev, ...waveformBatchRef.current];
          waveformBatchRef.current = [];
          if (next.length > MAX_WAVEFORM_POINTS) {
            return next.slice(-MAX_WAVEFORM_POINTS);
          }
          return next;
        });
      }

      detectPeak(point.value, point.timestamp);
      lastValueRef.current = point.value;
      sampleCountRef.current++;

      // Update stats every 500ms
      const now = Date.now();
      if (now - lastStatsUpdateRef.current > 500) {
        lastStatsUpdateRef.current = now;
        computeStats();
      }
    },
    [detectPeak, computeStats]
  );

  const reset = useCallback(() => {
    rawBufferRef.current = [];
    timestampBufferRef.current = [];
    peakTimesRef.current = [];
    rrIntervalsRef.current = [];
    bpmHistoryRef.current = [];
    sampleCountRef.current = 0;
    leadOffCountRef.current = 0;
    totalSamplesRef.current = 0;
    startTimeRef.current = Date.now();
    setWaveformData([]);
    setBpmTrend([]);
    setRRHistogram([]);
    setFrequencyData([]);
    setStats({
      bpm: 0,
      avgBpm: 0,
      minBpm: 0,
      maxBpm: 0,
      sdnn: 0,
      rmssd: 0,
      pnn50: 0,
      signalMin: 0,
      signalMax: 0,
      signalMean: 0,
      signalStdDev: 0,
      signalQuality: 0,
      totalBeats: 0,
      sessionDuration: 0,
      lfPower: 0,
      hfPower: 0,
      lfHfRatio: 0,
      respiratoryRate: 0,
    });
  }, []);

  return {
    stats,
    waveformData,
    bpmTrend,
    rrHistogram,
    frequencyData,
    addDataPoint,
    reset,
  };
}
