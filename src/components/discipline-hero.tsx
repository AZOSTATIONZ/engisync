"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Auto-advancing discipline slideshow.
 *
 * Deliberately restrained: a slow crossfade every 6 seconds, no captions
 * fighting the page heading, and a gradient scrim so overlaid text stays
 * readable on any photograph.
 *
 * Performance choices that matter on mobile data:
 *  - only the first image is `priority`; the rest load lazily
 *  - the timer stops entirely when the tab is hidden
 *  - `prefers-reduced-motion` freezes it on the first image
 *  - images are pre-optimised WebP (~95 KB), not full-resolution photos
 */
export function DisciplineHero({
  images,
  title,
  subtitle,
  className = "",
  height = "h-40 sm:h-52",
}: {
  images: string[];
  title?: string;
  subtitle?: string;
  className?: string;
  height?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // Don't burn cycles (or battery) animating a tab nobody is looking at.
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % images.length);
    }, 6000);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/60 ${height} ${className}`}
    >
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          aria-hidden="true"
          priority={i === 0}
          loading={i === 0 ? undefined : "lazy"}
          sizes="(max-width: 768px) 100vw, 900px"
          className={`object-cover transition-opacity [transition-duration:1200ms] ease-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Scrim: keeps any overlaid text legible regardless of the photo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />

      {(title || subtitle) && (
        <div className="absolute inset-0 flex flex-col justify-center gap-1 p-5 sm:p-7">
          {title && (
            <h2 className="max-w-[22ch] text-xl font-bold leading-tight text-white sm:text-2xl">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="max-w-[42ch] text-sm text-white/85">{subtitle}</p>
          )}
        </div>
      )}

      {/* Progress dots — also communicate that more images exist. */}
      {images.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Show image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}

      {paused && <span className="sr-only">Slideshow paused</span>}
    </div>
  );
}
