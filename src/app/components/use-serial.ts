import { useState, useRef, useCallback, useEffect } from "react";

export interface ECGDataPoint {
  timestamp: number;
  value: number;
  leadOff: boolean;
}

export interface SerialState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  port: SerialPort | null;
}

export function useSerial(onData: (point: ECGDataPoint) => void) {
  const [state, setState] = useState<SerialState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    port: null,
  });

  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const portRef = useRef<SerialPort | null>(null);
  const bufferRef = useRef("");
  const startTimeRef = useRef(0);

  const connect = useCallback(async (baudRate: number = 115200) => {
    if (!("serial" in navigator)) {
      setState((s) => ({
        ...s,
        error:
          "Web Serial API not supported. Use Chrome or Edge. Try Demo Mode instead.",
      }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });

      startTimeRef.current = Date.now();
      abortControllerRef.current = new AbortController();
      portRef.current = port;

      setState({
        isConnected: true,
        isConnecting: false,
        error: null,
        port,
      });

      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable, {
        signal: abortControllerRef.current.signal,
      });
      const reader = decoder.readable.getReader();
      readerRef.current = reader;

      // Read loop
      const readLoop = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              bufferRef.current += value;
              const lines = bufferRef.current.split("\n");
              bufferRef.current = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === "") continue;

                // Parse: "value" or "value,leadOff"
                const parts = trimmed.split(",");
                const val = parseInt(parts[0], 10);
                const leadOff =
                  parts.length > 1 ? parts[1].trim() === "1" : false;

                if (!isNaN(val)) {
                  onData({
                    timestamp: Date.now() - startTimeRef.current,
                    value: val,
                    leadOff,
                  });
                }
              }
            }
          }
        } catch (err: any) {
          if (err.name !== "AbortError") {
            console.error("Read error:", err);
          }
        }
      };

      readLoop();
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err.message || "Failed to connect",
      }));
    }
  }, [onData]);

  const disconnect = useCallback(async () => {
    try {
      abortControllerRef.current?.abort();
      readerRef.current?.cancel();
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (err) {
      // ignore close errors
    }
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      port: null,
    });
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { ...state, connect, disconnect };
}
