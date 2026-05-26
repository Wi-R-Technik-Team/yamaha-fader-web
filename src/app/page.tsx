import { ConnectionStatus } from "@/components/connection-status";
import { FaderChannel } from "@/components/fader-channel";
import { FADER_CHANNELS } from "@/config/fader-config";
import { TioProvider } from "@/context/tio-context";

const initialStates = Object.fromEntries(
  FADER_CHANNELS.map((cfg) => [
    cfg.ch,
    { value: cfg.defaultValue, muted: false },
  ]),
);

export default function Home() {
  return (
    <TioProvider initialStates={initialStates}>
      <main className="flex h-screen items-center justify-center gap-16 bg-background">
        <ConnectionStatus />
        {FADER_CHANNELS.map((cfg) => (
          <FaderChannel key={cfg.id} config={cfg} />
        ))}
      </main>
    </TioProvider>
  );
}
