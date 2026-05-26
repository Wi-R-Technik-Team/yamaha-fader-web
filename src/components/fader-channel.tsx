"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FaderChannelConfig } from "@/config/fader-config";
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
  const [value, setValue] = useState(config.defaultValue);
  const [muted, setMuted] = useState(false);
  const [manualMute, setManualMute] = useState(false);

  function handleChange(v: number) {
    setValue(v);
    if (v === config.min) {
      setMuted(true);
    } else if (!manualMute) {
      setMuted(false);
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setManualMute(next);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-2xl font-semibold tabular-nums">{value} %</span>
      <span className="text-xs tabular-nums text-muted-foreground -mt-3">
        {toDb(value)}
      </span>
      <VerticalFader
        value={value}
        onChange={handleChange}
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
