"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up to `value` once it scrolls into view.
 *
 * TWO THINGS THE GLOBAL CSS CANNOT HANDLE, so they are handled here:
 *
 * 1. `prefers-reduced-motion`. The rule in globals.css neutralises CSS
 *    animations and transitions — it has no effect on a number being changed
 *    by JavaScript. Someone who asked the system for less motion would still
 *    get every figure on the page ticking. Checked explicitly below.
 *
 * 2. The starting value. It used to start at 0, so a figure rendered on the
 *    server appeared as "0" until the observer fired — and stayed 0 forever if
 *    IntersectionObserver was unavailable. It now starts AT the value and only
 *    drops to 0 when an animation is actually about to run, so the correct
 *    number is what's shown in every degraded case.
 */
export function AnimatedCounter({
  value,
  suffix = "",
  duration = 1200,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }

    setDisplay(0);
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(value * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}
