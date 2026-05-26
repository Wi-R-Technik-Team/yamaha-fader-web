"use client";

import { useTio } from "@/context/tio-context";

const STATUS_CONFIG = {
  connected: { color: "bg-green-500", label: "Connected" },
  connecting: { color: "bg-yellow-500 animate-pulse", label: "Connecting…" },
  disconnected: { color: "bg-red-500", label: "Disconnected" },
} as const;

export function ConnectionStatus() {
  const { status } = useTio();
  const { color, label } = STATUS_CONFIG[status];

  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </div>
  );
}
