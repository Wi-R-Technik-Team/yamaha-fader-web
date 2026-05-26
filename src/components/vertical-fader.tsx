"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

interface VerticalFaderProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  color?: string;
  className?: string;
}

export function VerticalFader({
  value,
  onChange,
  onCommit,
  min = 0,
  max = 100,
  disabled = false,
  color = "#fbbf24",
  className,
}: VerticalFaderProps) {
  return (
    <SliderPrimitive.Root
      orientation="vertical"
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      onValueCommit={([v]) => onCommit?.(v)}
      min={min}
      max={max}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center touch-none select-none",
        "h-96 w-28",
        "data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed",
        className,
      )}
    >
      <SliderPrimitive.Track className="relative w-full h-full bg-zinc-800 rounded-3xl overflow-hidden">
        <SliderPrimitive.Range
          className="absolute bottom-0 w-full"
          style={{ backgroundColor: color }}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block w-14 h-2.5 rounded-full bg-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-grab active:cursor-grabbing" />
    </SliderPrimitive.Root>
  );
}
