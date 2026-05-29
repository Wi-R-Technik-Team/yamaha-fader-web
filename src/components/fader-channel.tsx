"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FaderChannelConfig } from "@/config/fader-config";
import { useTio } from "@/context/tio-context";
import { VerticalFader } from "./vertical-fader";

interface FaderChannelProps {
  config: FaderChannelConfig;
}

const GAIN_SEND_INTERVAL_MS = 80;

function toDb(pct: number, minDb: number, maxDb: number): string {
  if (pct === 0) return "MUTE";
  const db = minDb + (pct / 100) * (maxDb - minDb);
  return (db >= 0 ? "+" : "") + db.toFixed(1) + " dB";
}

export function FaderChannel({ config }: FaderChannelProps) {
  const minDb = config.minDb ?? -6;
  const maxDb = config.maxDb ?? 8;
  const { faderStates, updateGain, updateMute } = useTio();
  const { value, muted } = faderStates[config.ch] ?? {
    value: config.defaultValue,
    muted: false,
  };

  const [manualMute, setManualMute] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const lastGainSentAt = useRef(0);
  const lastGainSentValue = useRef<number | null>(null);
  const pendingGainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDragging) setDisplayValue(value);
  }, [isDragging, value]);

  useEffect(
    () => () => {
      if (pendingGainTimer.current) clearTimeout(pendingGainTimer.current);
    },
    [],
  );

  function sendGain(v: number) {
    lastGainSentAt.current = Date.now();
    lastGainSentValue.current = v;
    updateGain(config.ch, v);
  }

  function sendGainThrottled(v: number) {
    const elapsed = Date.now() - lastGainSentAt.current;

    if (elapsed >= GAIN_SEND_INTERVAL_MS) {
      if (pendingGainTimer.current) clearTimeout(pendingGainTimer.current);
      pendingGainTimer.current = null;
      sendGain(v);
      return;
    }

    if (pendingGainTimer.current) clearTimeout(pendingGainTimer.current);
    pendingGainTimer.current = setTimeout(() => {
      pendingGainTimer.current = null;
      sendGain(v);
    }, GAIN_SEND_INTERVAL_MS - elapsed);
  }

  function handleChange(v: number) {
    setIsDragging(true);
    setDisplayValue(v);
    sendGainThrottled(v);
  }

  function handleCommit(v: number) {
    setIsDragging(false);
    setDisplayValue(v);
    if (pendingGainTimer.current) clearTimeout(pendingGainTimer.current);
    pendingGainTimer.current = null;
    if (lastGainSentValue.current !== v) sendGain(v);

    if (v === config.min) {
      updateMute(config.ch, true);
    } else if (!manualMute) {
      updateMute(config.ch, false);
    }
  }

  function toggleMute() {
    const next = !muted;
    setManualMute(next);
    updateMute(config.ch, next);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-2xl font-semibold tabular-nums">
        {displayValue} %
      </span>
      <span className="text-xs tabular-nums text-muted-foreground -mt-3">
        {toDb(displayValue, minDb, maxDb)}
      </span>
      <VerticalFader
        value={displayValue}
        onChange={handleChange}
        onCommit={handleCommit}
        min={config.min}
        max={config.max}
        color={config.color}
        className={muted ? "opacity-40" : undefined}
      />
      <span className="text-sm font-medium text-muted-foreground">
        {config.label}
      </span>
      <Button
        variant={muted ? "destructive" : "outline"}
        size="sm"
        onClick={toggleMute}
        className="w-24"
      >
        {muted ? "Muted" : "Mute"}
      </Button>
    </div>
  );
}
