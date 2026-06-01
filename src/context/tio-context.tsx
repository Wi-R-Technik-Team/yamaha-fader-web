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

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface FaderState {
  value: number;
  muted: boolean;
}

interface TioContextValue {
  status: ConnectionStatus;
  faderStates: Record<number, FaderState>;
  updateGain: (ch: number, value: number, gainDb: number) => void;
  updateMute: (ch: number, on: boolean) => void;
  sendPhantom: (ch: number, on: boolean) => void;
}

const TioContext = createContext<TioContextValue | null>(null);

const WS_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080")
    : "";

const RECONNECT_DELAY_MS = 3000;

interface TioProviderProps {
  children: ReactNode;
  initialStates: Record<number, FaderState>;
}

export function TioProvider({ children, initialStates }: TioProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionId = useRef(crypto.randomUUID());

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [faderStates, setFaderStates] =
    useState<Record<number, FaderState>>(initialStates);

  const setChannel = useCallback(
    (ch: number, patch: Partial<FaderState>) =>
      setFaderStates((prev) => ({
        ...prev,
        [ch]: { ...prev[ch], ...patch },
      })),
    [],
  );

  const applyMessage = useCallback(
    (raw: string) => {
      try {
        const msg = JSON.parse(raw) as Record<string, unknown>;
        if (msg._sid === sessionId.current) return;
        if (
          msg.command === "mute" &&
          typeof msg.ch === "number" &&
          typeof msg.on === "boolean"
        ) {
          setChannel(msg.ch, { muted: msg.on });
        }
      } catch {
        // ignore malformed messages
      }
    },
    [setChannel],
  );

  const connect = useCallback(() => {
    if (!WS_URL || wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");
    ws.onclose = () => {
      setStatus("disconnected");
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

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ ...payload, _sid: sessionId.current }),
      );
    }
  }, []);

  const updateGain = useCallback(
    (ch: number, value: number, gainDb: number) => {
      setChannel(ch, { value });
      send({ command: "gain", ch, gain: gainDb });
    },
    [send, setChannel],
  );

  const updateMute = useCallback(
    (ch: number, on: boolean) => {
      setChannel(ch, { muted: on });
      send({ command: "mute", ch, on });
    },
    [send, setChannel],
  );

  const sendPhantom = useCallback(
    (ch: number, on: boolean) => send({ command: "phantom", ch, on }),
    [send],
  );

  return (
    <TioContext.Provider
      value={{ status, faderStates, updateGain, updateMute, sendPhantom }}
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
