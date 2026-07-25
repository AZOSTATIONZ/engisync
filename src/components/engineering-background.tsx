"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight animated "engineering network" background — drifting nodes
 * connected by circuit-like lines with travelling pulses. Canvas 2D, capped
 * DPR, pauses when the tab is hidden, and respects reduced-motion. Designed to
 * stay smooth and cheap (no WebGL, small node count).
 */
export function EngineeringBackground({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = ref.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!context) return;

    // Non-null locals so nested closures keep the narrowed types.
    const cvs: HTMLCanvasElement = canvasEl;
    const c: CanvasRenderingContext2D = context;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    type Node = { x: number; y: number; vx: number; vy: number };
    let nodes: Node[] = [];
    let raf = 0;
    let running = true;
    let t = 0;
    const LINK = 130;

    function resize() {
      const parent = cvs.parentElement;
      w = parent?.clientWidth ?? window.innerWidth;
      h = parent?.clientHeight ?? window.innerHeight;
      cvs.width = w * dpr;
      cvs.height = h * dpr;
      cvs.style.width = `${w}px`;
      cvs.style.height = `${h}px`;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(70, Math.floor((w * h) / 22000) * density);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    }

    function color(alpha: number) {
      const dark = document.documentElement.classList.contains("dark");
      return dark
        ? `rgba(96, 165, 250, ${alpha})`
        : `rgba(37, 99, 235, ${alpha})`;
    }

    function frame() {
      if (!running) return;
      t += 0.005;
      c.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK) {
            const alpha = (1 - dist / LINK) * 0.35;
            c.strokeStyle = color(alpha);
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.stroke();

            const p = (Math.sin(t * 6 + (i + j)) + 1) / 2;
            c.fillStyle = color(alpha * 1.6);
            c.beginPath();
            c.arc(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p, 1.4, 0, Math.PI * 2);
            c.fill();
          }
        }
      }

      for (const n of nodes) {
        c.fillStyle = color(0.7);
        c.beginPath();
        c.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
        c.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      running = !document.hidden;
      if (running) frame();
      else cancelAnimationFrame(raf);
    }

    resize();
    if (reduce) {
      running = true;
      frame();
      running = false;
      cancelAnimationFrame(raf);
    } else {
      frame();
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
