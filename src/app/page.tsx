import { FaderChannel } from "@/components/fader-channel";
import { FADER_CHANNELS } from "@/config/fader-config";

export default function Home() {
  return (
    <main className="flex h-screen items-center justify-center gap-16 bg-background">
      {FADER_CHANNELS.map((cfg) => (
        <FaderChannel key={cfg.id} config={cfg} />
      ))}
    </main>
  );
}
