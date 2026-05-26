"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FaderChannelConfig } from "@/config/fader-config";
import { useTio } from "@/context/tio-context";
import { VerticalFader } from "./vertical-fader";

interface FaderChannelProps {
  config: FaderChannelConfig;
}

const GAIN_MIN_DB = -6;
const GAIN_MAX_DB = 8;

function toDb(pct: number): string {
  if (pct === 0) return "MUTE";
  const db = GAIN_MIN_DB + (pct / 100) * (GAIN_MAX_DB - GAIN_MIN_DB);
  return (db >= 0 ? "+" : "") + db.toFixed(1) + " dB";
}

export function FaderChannel({ config }: FaderChannelProps) {
  const { faderStates, updateGain, updateMute } = useTio();
  const { value, muted } = faderStates[config.ch] ?? {
    value: config.defaultValue,
    muted: false,
  };

  const [manualMute, setManualMute] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (!isDragging) setDisplayValue(value);
  }, [isDragging, value]);

  function handleChange(v: number) {
    setIsDragging(true);
    setDisplayValue(v);
  }

  function handleCommit(v: number) {
    setIsDragging(false);
    setDisplayValue(v);
    updateGain(config.ch, v);
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
        {toDb(displayValue)}
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
