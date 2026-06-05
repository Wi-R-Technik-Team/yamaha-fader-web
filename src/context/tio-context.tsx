"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEVICE_CONFIG,
  type DeviceMode,
  FADER_CHANNELS,
} from "@/config/fader-config";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";
export type { DeviceMode };

export interface FaderState {
  value: number;
  muted: boolean;
}

export interface DeviceConfig {
  host: string | null;
  mode: DeviceMode;
}

export interface ScannedDevice {
  hostname: string;
  port: number;
}

interface TioContextValue {
  status: ConnectionStatus;
  faderStates: Record<number, FaderState>;
  deviceConfig: DeviceConfig;
  scanResults: ScannedDevice[];
  isScanRunning: boolean;
  updateGain: (ch: number, value: number, gainDb: number) => void;
  updateMute: (ch: number, on: boolean) => void;
  sendPhantom: (ch: number, on: boolean) => void;
  scanDevices: () => void;
  setHost: (host: string) => void;
  setDeviceMode: (mode: DeviceMode) => void;
}

const TioContext = createContext<TioContextValue | null>(null);

const WS_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080")
    : "";

const RECONNECT_DELAY_MS = 3000;

const CHANNEL_DB = Object.fromEntries(
  FADER_CHANNELS.map((cfg) => [
    cfg.ch,
    { minDb: cfg.minDb ?? -6, maxDb: cfg.maxDb ?? 16 },
  ]),
);

function gainToSlider(db: number, minDb: number, maxDb: number): number {
  const rawPercentage = ((db - minDb) / (maxDb - minDb)) * 100;
  
  return Math.max(0, Math.min(100, Math.round(rawPercentage)));
}

function sliderToGain(value: number, minDb: number, maxDb: number): number {
  return Math.round(minDb + (value / 100) * (maxDb - minDb));
}

interface TioProviderProps {
  children: ReactNode;
  initialStates: Record<number, FaderState>;
}

export function TioProvider({ children, initialStates }: TioProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialStatesRef = useRef(initialStates);
  const deviceConfigRef = useRef<DeviceConfig>({
    host: DEVICE_CONFIG.host,
    mode: DEVICE_CONFIG.mode,
  });
  const faderStatesRef = useRef(initialStates);
  const pendingSyncChannels = useRef<Set<number>>(new Set());

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [faderStates, setFaderStates] =
    useState<Record<number, FaderState>>(initialStates);
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig>({
    host: DEVICE_CONFIG.host,
    mode: DEVICE_CONFIG.mode,
  });
  const [scanResults, setScanResults] = useState<ScannedDevice[]>([]);
  const [isScanRunning, setIsScanRunning] = useState(false);

  const setChannel = useCallback(
    (ch: number, patch: Partial<FaderState>) =>
      setFaderStates((prev) => {
        const next = { ...prev, [ch]: { ...prev[ch], ...patch } };
        faderStatesRef.current = next;
        return next;
      }),
    [],
  );

  const patchDeviceConfig = useCallback((patch: Partial<DeviceConfig>) => {
    setDeviceConfig((prev) => {
      const next = { ...prev, ...patch };
      deviceConfigRef.current = next;
      return next;
    });
  }, []);

  const applyMessage = useCallback(
    (raw: string) => {
      try {
        const msg = JSON.parse(raw) as Record<string, unknown>;

        if (msg.type === "GainState") {
          const ch = msg.ch as number;
          const range = CHANNEL_DB[ch];
          if (range) {
            const sliderValue = gainToSlider(
              msg.value as number,
              range.minDb,
              range.maxDb,
            );
            setChannel(ch, { value: sliderValue });
            pendingSyncChannels.current.delete(ch);
            if (pendingSyncChannels.current.size === 0) {
              console.log("[TIO] Initial sync complete — all channels synced");
            } else {
              console.log(
                `[TIO] Ch ${ch} synced: ${(msg.value as number).toFixed(1)} dB → ${sliderValue.toFixed(0)}%`,
              );
            }
          }
          return;
        }

        if (msg.type === "ConfigState") {
          const host = (msg.host as string | null) ?? null;
          const mode = msg.mode as DeviceMode;
          patchDeviceConfig({ host, mode });
          console.log(
            `[TIO] Config confirmed — host: ${host ?? "none"}, mode: ${mode}`,
          );
          return;
        }

        if (msg.type === "DeviceList") {
          const devices = msg.devices as ScannedDevice[];
          setScanResults(devices);
          setIsScanRunning(false);
          console.log(
            `[TIO] Scan complete — ${devices.length} device(s) found`,
          );
          return;
        }

        if (msg.type === "Command") {
          const gain = msg.Gain as { ch: number; value: number } | undefined;
          if (gain) {
            const range = CHANNEL_DB[gain.ch];
            if (range) {
              setChannel(gain.ch, {
                value: gainToSlider(gain.value, range.minDb, range.maxDb),
              });
            }
            return;
          }
          const mute = msg.Mute as { ch: number; on: boolean } | undefined;
          if (mute) {
            setChannel(mute.ch, { muted: mute.on });
            return;
          }
        }

        if (msg.type === "Config") {
          const sh = msg.SetHost as { host: string } | undefined;
          if (sh) {
            patchDeviceConfig({ host: sh.host });
            return;
          }
          const sm = msg.SetDeviceMode as { mode: DeviceMode } | undefined;
          if (sm) {
            patchDeviceConfig({ mode: sm.mode });
            return;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    },
    [setChannel, patchDeviceConfig],
  );

  const sendRaw = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const connect = useCallback(() => {
    if (!WS_URL || wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      console.log(
        `[TIO] Connected — sending config: host=${DEVICE_CONFIG.host}, mode=${DEVICE_CONFIG.mode}`,
      );

      ws.send(
        JSON.stringify({
          type: "Config",
          SetHost: { host: DEVICE_CONFIG.host },
        }),
      );
      ws.send(
        JSON.stringify({
          type: "Config",
          SetDeviceMode: { mode: DEVICE_CONFIG.mode },
        }),
      );

      ws.send(JSON.stringify({ type: "Get", target: "config" }));

      const channels = Object.keys(initialStatesRef.current).map(Number);
      if (channels.length > 0) {
        pendingSyncChannels.current = new Set(channels);
        console.log(`[TIO] Syncing channels: ${channels.join(", ")}`);
        channels.forEach((ch) => {
          ws.send(JSON.stringify({ type: "Get", target: "gain", ch }));
        });
      }
    };
    ws.onclose = () => {
      setStatus("disconnected");
      pendingSyncChannels.current.clear();
      console.log(
        `[TIO] Disconnected — reconnecting in ${RECONNECT_DELAY_MS / 1000}s`,
      );
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e: MessageEvent<string>) => applyMessage(e.data);
  }, [applyMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const updateGain = useCallback(
    (ch: number, value: number, gainDb: number) => {
      setChannel(ch, { value });
      const isMuted = faderStatesRef.current[ch]?.muted ?? false;
      const { mode } = deviceConfigRef.current;

      const effectiveGain =
        isMuted && mode === "Tio" ? (CHANNEL_DB[ch]?.minDb ?? -6) : gainDb;
      sendRaw({ type: "Command", Gain: { ch, value: effectiveGain } });
    },
    [sendRaw, setChannel],
  );

  const updateMute = useCallback(
    (ch: number, on: boolean) => {
      setChannel(ch, { muted: on });
      const { mode } = deviceConfigRef.current;
      const range = CHANNEL_DB[ch];
      if (!range) return;

      if (mode === "Tio") {
        const gainDb = on
          ? range.minDb
          : sliderToGain(
              faderStatesRef.current[ch]?.value ?? 0,
              range.minDb,
              range.maxDb,
            );
        sendRaw({ type: "Command", Gain: { ch, value: gainDb } });
      } else {
        sendRaw({ type: "Command", Mute: { ch, on } });
      }
    },
    [sendRaw, setChannel],
  );

  const sendPhantom = useCallback(
    (ch: number, on: boolean) =>
      sendRaw({ type: "Command", Phantom: { ch, on } }),
    [sendRaw],
  );

  const scanDevices = useCallback(() => {
    setScanResults([]);
    setIsScanRunning(true);
    console.log("[TIO] Scan started — waiting up to 5s for devices");
    sendRaw({ type: "Get", target: "scan" });
  }, [sendRaw]);

  const setHost = useCallback(
    (host: string) => {
      patchDeviceConfig({ host });
      sendRaw({ type: "Config", SetHost: { host } });
    },
    [sendRaw, patchDeviceConfig],
  );

  const setDeviceMode = useCallback(
    (mode: DeviceMode) => {
      patchDeviceConfig({ mode });
      sendRaw({ type: "Config", SetDeviceMode: { mode } });
    },
    [sendRaw, patchDeviceConfig],
  );

  return (
    <TioContext.Provider
      value={{
        status,
        faderStates,
        deviceConfig,
        scanResults,
        isScanRunning,
        updateGain,
        updateMute,
        sendPhantom,
        scanDevices,
        setHost,
        setDeviceMode,
      }}
    >
      {children}
    </TioContext.Provider>
  );
}

export function useTio() {
  const ctx = useContext(TioContext);
  if (!ctx) throw new Error("useTio must be used within TioProvider");
  return ctx;
}
