"use client";

import { useState } from "react";
import { ConnectionStatus } from "@/components/connection-status";
import { Button } from "@/components/ui/button";
import { DEVICE_CONFIG, FADER_CHANNELS } from "@/config/fader-config";
import { TioProvider, useTio } from "@/context/tio-context";

function AdminContent() {
  const {
    deviceConfig,
    scanResults,
    isScanRunning,
    scanDevices,
    setHost,
    setDeviceMode,
  } = useTio();

  const [didScan, setDidScan] = useState(false);

  function handleScan() {
    setDidScan(true);
    scanDevices();
  }

  function handleSync() {
    setHost(DEVICE_CONFIG.host);
    setDeviceMode(DEVICE_CONFIG.mode);
  }

  const isSynced =
    deviceConfig.host === DEVICE_CONFIG.host &&
    deviceConfig.mode === DEVICE_CONFIG.mode;

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin</h1>
          <ConnectionStatus />
        </div>


        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Konfiguration (fader-config.ts)
          </h2>
          <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Host</span>
              <span className="font-mono">{DEVICE_CONFIG.host}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode</span>
              <span className="font-mono">{DEVICE_CONFIG.mode}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Backend
          </h2>
          <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Host</span>
              <span className="font-mono">{deviceConfig.host ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode</span>
              <span className="font-mono">{deviceConfig.mode}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isSynced ? "Synchronized" : "Out of sync with config"}
            </span>
            <Button size="sm" variant="outline" onClick={handleSync}>
              Sync from Config
            </Button>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            mDNS Scan
          </h2>
          <Button onClick={handleScan} disabled={isScanRunning} size="sm">
            {isScanRunning ? "Scanne…" : "Scan starten"}
          </Button>
          {didScan && !isScanRunning && scanResults.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Keine Geräte gefunden.
            </p>
          )}
          {scanResults.length > 0 && (
            <ul className="mt-3 space-y-2">
              {scanResults.map((device) => (
                <li
                  key={device.hostname}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-2"
                >
                  <span className="font-mono text-sm">
                    {device.hostname}:{device.port}
                  </span>
                  <Button
                    size="sm"
                    variant={
                      deviceConfig.host === device.hostname
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setHost(device.hostname)}
                  >
                    {deviceConfig.host === device.hostname
                      ? "Aktiv"
                      : "Als Host"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Channels
          </h2>
          <ul className="space-y-2">
            {FADER_CHANNELS.map((cfg) => (
              <li
                key={cfg.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {cfg.color && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                  )}
                  <div>
                    <span className="text-sm font-medium">{cfg.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      Ch {cfg.ch}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-muted-foreground">
                  <div>{DEVICE_CONFIG.mode}</div>
                  <div>{DEVICE_CONFIG.host}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <TioProvider initialStates={{}}>
      <AdminContent />
    </TioProvider>
  );
}
