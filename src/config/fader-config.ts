export interface FaderChannelConfig {
  id: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  rcpCommand: string;
  color?: string; // Default is #fbbf24
}

export const FADER_CHANNELS: FaderChannelConfig[] = [
  {
    id: "left",
    label: "Mikro Links",
    min: 0,
    max: 100,
    defaultValue: 75,
    rcpCommand: "set_fader_l",
    color: "#fbbf24",
  },
  {
    id: "right",
    label: "Mikro Rechts",
    min: 0,
    max: 100,
    defaultValue: 75,
    rcpCommand: "set_fader_r",
    color: "#5b34cf",
  },
  {
    id: "monitor",
    label: "monitor123  ",
    min: 0,
    max: 100,
    defaultValue: 50,
    rcpCommand: "set_fader_m",
    color: "#22c55e",
  },
  {
    id: "bannane",
    label: "bannane",
    min: 0,
    max: 100,
    defaultValue: 50,
    rcpCommand: "set_fader_m",
    color: "#3b82f6",
  },
];
