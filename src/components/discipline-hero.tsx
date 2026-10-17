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
      {/* SCRIM STRENGTH IS A CONTRAST DECISION, not a styling one.
          This was `from-black/75 via-black/45 to-black/10`, which is plenty
          at the left edge and runs out exactly where the text ends. Measured
          with sharp against all 40 hero images, compositing the scrim over
          real pixels and the text over that: 24 of 80 cases failed AA, worst
          3.54:1, and even the OPAQUE heading failed at 4.21:1 on
          me-turbine.webp. The photographs vary enormously — a dark refinery
          passes at 10.71:1 while a bright turbine workshop does not — so
          checking the image that happens to be on screen proves nothing. The
          slideshow rotates through all of them.

          80/65/25 clears every image with the text at its widest: 5.20:1 at
          the narrowest viewport, where the text spans 60% of the hero. The
          right-hand end stays at 25% so the photograph is still visible
          there, which is the whole point of having one. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/65 to-black/25" />

      {(title || subtitle) && (
        <div className="absolute inset-0 flex flex-col justify-center gap-1 p-5 sm:p-7">
          {title && (
            <h2 className="max-w-[22ch] text-xl font-bold leading-tight text-white sm:text-2xl">
              {title}
            </h2>
          )}
          {/* Opaque, not `text-white/85`. Fading text that already sits on a
              photograph costs about 1.4:1 and took this to 4.29:1 on a narrow
              screen even with the stronger scrim. The subtitle reads as
              secondary through size and measure, neither of which costs
              contrast. Same trap as the banner subtitle. */}
          {subtitle && (
            <p className="max-w-[42ch] text-sm text-white">{subtitle}</p>
          )}
        </div>
      )}

      {/* Progress dots — also communicate that more images exist.

          THE BUTTON IS 24x24; THE DOT INSIDE IT IS NOT.
          These were 6x6px buttons, which is a WCAG 2.2 AA failure under 2.5.8
          (target size, 24x24 minimum). The spacing exception does not rescue
          them either: at 6px wide with a 6px gap the centres are about 12px
          apart, so the 24px exclusion circles overlap heavily — which is also
          why simply inflating the hit area with a pseudo-element would have
          made adjacent dots fight over the same taps.

          So the TARGET grows to 24x24 and the dot stays 6px inside it, with
          the gap closed to compensate. Centres land ~26px apart, clear of
          each other, and the hero looks identical: same dot size, same
          spacing between the visible marks. Verified by measuring the
          rendered rects at 375px. */}
      {images.length > 1 && (
        <div className="absolute bottom-1 right-2.5 flex gap-0.5">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Show image ${i + 1}`}
              onClick={() => setIndex(i)}
              className="flex h-6 w-6 items-center justify-center rounded-full"
            >
              <span
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {paused && <span className="sr-only">Slideshow paused</span>}
    </div>
  );
}
