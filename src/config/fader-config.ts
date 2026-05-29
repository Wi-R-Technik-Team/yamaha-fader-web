export interface FaderChannelConfig {
  id: string;
  label: string;
  ch: number;
  min: number;
  max: number;
  defaultValue: number;
  minDb?: number; // Default is -6
  maxDb?: number; // Default is +8
  color?: string; // Default is #fbbf24
}

export const FADER_CHANNELS: FaderChannelConfig[] = [
  {
    id: "left",
    label: "Mikro Links",
    ch: 0,
    min: 0,
    max: 100,
    defaultValue: 75,
    color: "#fbbf24",
  },
  {
    id: "right",
    label: "Mikro Rechts",
    ch: 1,
    min: 0,
    max: 100,
    defaultValue: 75,
    color: "#5b34cf",
  },
  {
    id: "monitor",
    label: "monitor123",
    ch: 2,
    min: 0,
    max: 100,
    defaultValue: 50,
    color: "#22c55e",
  },
  {
    id: "bannane",
    label: "bannane",
    ch: 3,
    min: 0,
    max: 100,
    defaultValue: 50,
    color: "#3b82f6",
    minDb: -6,
    maxDb: 16
  },
];
