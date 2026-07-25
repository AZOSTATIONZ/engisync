"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type Slide = {
  /** Image path under /public (optional — falls back to the gradient). */
  src?: string;
  label: string;
  gradient: string; // tailwind gradient classes, shown as fallback/overlay base
};

/**
 * Auto-advancing crossfade slider. Each slide always has a gradient base, with
 * an optional image layered on top (hidden gracefully if the file is missing) —
 * so it looks good even before you add real photos to /public/images.
 */
export function ImageSlider({
  slides,
  interval = 4000,
  className = "",
}: {
  slides: Slide[];
  interval?: number;
  className?: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setActive((a) => (a + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [slides.length, interval]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {slides.map((s, i) => (
        <div
          key={i}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            i === active ? "opacity-100" : "opacity-0",
          )}
        >
          <div className={cn("absolute inset-0 bg-gradient-to-br", s.gradient)} />
          {s.src && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={s.src}
              alt={s.label}
              className="absolute inset-0 h-full w-full object-cover opacity-70"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>
      ))}

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === active ? "w-5 bg-white" : "w-1.5 bg-white/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}
