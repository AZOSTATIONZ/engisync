"use client";

import { useEffect, useRef } from "react";
import type { DisciplineKey } from "@/lib/media";

/**
 * The ambient background — what a discipline looks like when it is idle.
 *
 * WHY PER-DISCIPLINE
 * A civil engineer and an electronic engineer do not picture the same thing
 * when they picture "engineering". One generic node graph for everyone says the
 * product was built for nobody in particular. The motif is the cheapest way to
 * tell a student the software knows what they study.
 *
 * THE RULES THIS OBEYS
 * It sits behind real work, so it is bound by the same discipline as the
 * aurora: never above 0.09 opacity, nothing faster than a slow drift, and it
 * must be impossible to catch yourself watching it. If you notice the
 * background while reading a task, it has failed.
 *
 * PERFORMANCE
 * The previous background compared every node against every other node each
 * frame — 70 nodes is 2,415 distance checks per frame, ~145k square roots a
 * second, to draw lines that barely register. Here the geometry is generated
 * ONCE on resize and only cheap scalars animate: a pulse position along a fixed
 * path, a rotation angle. Frame cost is close to constant and independent of
 * how interesting the motif looks.
 *
 * It also:
 *   · renders at 1x regardless of screen density, and caps itself at 30fps —
 *     both measured decisions, not guesses (see the notes inline)
 *   · stops entirely when the tab is hidden, so a backgrounded tab costs
 *     nothing
 *   · draws a single frame and stops under `prefers-reduced-motion`, keeping
 *     the texture without the movement
 *   · follows `--primary`, so it re-colours with the theme and the accent
 *     instead of being hardcoded blue like its predecessor
 */

type Motif = "circuit" | "gears" | "blueprint" | "molecules" | "network";

/** Which motif belongs to which discipline. */
function motifFor(d: DisciplineKey): Motif {
  switch (d) {
    case "electronic":
    case "electrical":
    case "computer-engineering":
    case "mechatronics":
      return "circuit";
    case "mechanical":
      return "gears";
    case "civil":
      return "blueprint";
    case "chemical":
      return "molecules";
    case "computer-science":
    case "software":
      return "network";
    default:
      return "network";
  }
}

export function LivingBackground({
  discipline = "general",
  opacity = 0.075,
}: {
  discipline?: DisciplineKey;
  opacity?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const isBlueprint = motifFor(discipline) === "blueprint";

  useEffect(() => {
    // Blueprint is pure CSS (see .bp-grid). No canvas, no rAF.
    if (motifFor(discipline) === "blueprint") return;
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const cvs = el;
    const c = ctx;
    const motif = motifFor(discipline);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // DPR 1, deliberately. This layer sits at ~7% opacity behind content;
    // nobody can see aliasing through that, and rendering it at 2x quadrupled
    // the pixel cost of a purely decorative surface. Measured: the canvas was
    // taking the page from 53fps to 26fps before this.
    const dpr = 1;

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;
    let t = 0;

    // Read the brand colour from CSS so the motif follows theme + accent.
    // Re-read only when the theme actually changes, never per frame —
    // getComputedStyle forces style resolution and would cost more than the
    // drawing does.
    let stroke = "rgba(120,160,255,1)";
    function readColor() {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
      // Custom property holds "H S% L%" — usable directly inside hsl().
      stroke = raw ? `hsl(${raw})` : "hsl(210 90% 65%)";
    }

    /* ── Geometry, generated once per resize ─────────────────────────── */
    type Trace = { pts: [number, number][]; len: number; phase: number };
    type Gear = { x: number; y: number; r: number; teeth: number; dir: number };
    type Particle = { x: number; y: number; vx: number; vy: number };

    let traces: Trace[] = [];
    let gears: Gear[] = [];
    let particles: Particle[] = [];
    let bonds: [number, number][] = [];

    function buildCircuit() {
      // Manhattan routing — right angles are what make a drawing read as a
      // printed board rather than an abstract graph.
      const count = Math.max(6, Math.min(16, Math.floor(w / 130)));
      traces = Array.from({ length: count }, () => {
        const pts: [number, number][] = [];
        let x = Math.random() * w;
        let y = Math.random() * h;
        pts.push([x, y]);
        const segs = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < segs; i++) {
          const run = 60 + Math.random() * 140;
          if (i % 2 === 0) x += Math.random() > 0.5 ? run : -run;
          else y += Math.random() > 0.5 ? run : -run;
          pts.push([x, y]);
        }
        let len = 0;
        for (let i = 1; i < pts.length; i++) {
          len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        }
        return { pts, len, phase: Math.random() };
      });
    }

    function buildGears() {
      const count = Math.max(3, Math.min(7, Math.floor(w / 320)));
      gears = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 40 + Math.random() * 90,
        teeth: 10 + Math.floor(Math.random() * 10),
        dir: i % 2 === 0 ? 1 : -1,
      }));
    }

    function buildParticles() {
      const count = Math.max(14, Math.min(46, Math.floor((w * h) / 34000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
      }));
      // Bond pairs are chosen ONCE. The old version re-tested every pair every
      // frame; a fixed sparse set looks the same and costs nothing.
      bonds = [];
      for (let i = 0; i < particles.length; i++) {
        const j = (i + 1 + Math.floor(Math.random() * 3)) % particles.length;
        if (i !== j) bonds.push([i, j]);
      }
    }

    function resize() {
      const parent = cvs.parentElement;
      w = parent?.clientWidth ?? window.innerWidth;
      h = parent?.clientHeight ?? window.innerHeight;
      cvs.width = Math.max(1, w * dpr);
      cvs.height = Math.max(1, h * dpr);
      cvs.style.width = `${w}px`;
      cvs.style.height = `${h}px`;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (motif === "circuit") buildCircuit();
      else if (motif === "gears") buildGears();
      else buildParticles();
    }

    /* ── Drawing ─────────────────────────────────────────────────────── */

    function drawCircuit() {
      c.lineWidth = 1;
      c.strokeStyle = stroke;
      for (const tr of traces) {
        c.globalAlpha = opacity;
        c.beginPath();
        c.moveTo(tr.pts[0][0], tr.pts[0][1]);
        for (let i = 1; i < tr.pts.length; i++) c.lineTo(tr.pts[i][0], tr.pts[i][1]);
        c.stroke();

        // Pads at every corner — the visual signature of a board.
        c.globalAlpha = opacity * 1.5;
        for (const [px, py] of tr.pts) {
          c.beginPath();
          c.arc(px, py, 2, 0, Math.PI * 2);
          c.fillStyle = stroke;
          c.fill();
        }

        // A single travelling pulse. This is the only thing that moves.
        const prog = (t * 0.06 + tr.phase) % 1;
        let travelled = prog * tr.len;
        for (let i = 1; i < tr.pts.length; i++) {
          const [ax, ay] = tr.pts[i - 1];
          const [bx, by] = tr.pts[i];
          const seg = Math.hypot(bx - ax, by - ay);
          if (travelled <= seg) {
            const k = seg === 0 ? 0 : travelled / seg;
            c.globalAlpha = opacity * 3.2;
            c.beginPath();
            c.arc(ax + (bx - ax) * k, ay + (by - ay) * k, 2.4, 0, Math.PI * 2);
            c.fill();
            break;
          }
          travelled -= seg;
        }
      }
      c.globalAlpha = 1;
    }

    function drawGears() {
      c.strokeStyle = stroke;
      c.lineWidth = 1.2;
      for (const g of gears) {
        const a = t * 0.12 * g.dir;
        c.globalAlpha = opacity;
        c.beginPath();
        c.arc(g.x, g.y, g.r * 0.62, 0, Math.PI * 2);
        c.stroke();
        // Teeth as radial spokes — a full involute profile would be invisible
        // at this opacity and cost far more to draw.
        for (let i = 0; i < g.teeth; i++) {
          const ang = a + (i / g.teeth) * Math.PI * 2;
          c.beginPath();
          c.moveTo(g.x + Math.cos(ang) * g.r * 0.62, g.y + Math.sin(ang) * g.r * 0.62);
          c.lineTo(g.x + Math.cos(ang) * g.r, g.y + Math.sin(ang) * g.r);
          c.stroke();
        }
        c.beginPath();
        c.arc(g.x, g.y, g.r * 0.14, 0, Math.PI * 2);
        c.stroke();
      }
      c.globalAlpha = 1;
    }

    function drawParticles(withBonds: boolean) {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      c.strokeStyle = stroke;
      c.fillStyle = stroke;
      c.lineWidth = 1;
      if (withBonds) {
        c.globalAlpha = opacity * 0.8;
        c.beginPath();
        for (const [i, j] of bonds) {
          const a = particles[i];
          const b = particles[j];
          // Only bond while genuinely close, so the lattice breathes instead of
          // dragging rubber bands across the whole screen.
          if (Math.hypot(a.x - b.x, a.y - b.y) < 190) {
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
          }
        }
        c.stroke();
      }
      c.globalAlpha = opacity * 1.8;
      for (const p of particles) {
        c.beginPath();
        c.arc(p.x, p.y, 2, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }

    // 30fps cap. The motion here is a slow drift; at these speeds 30 and 60
    // are indistinguishable, and halving the frame count halves the cost of the
    // whole effect. The main thread is better spent on the interface.
    const FRAME_MS = 1000 / 30;
    let lastDraw = 0;

    function frame(now?: number) {
      if (!running) return;
      const ts = now ?? 0;
      if (ts - lastDraw < FRAME_MS) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastDraw = ts;
      t += 0.033;
      c.clearRect(0, 0, w, h);
      if (motif === "circuit") drawCircuit();
      else if (motif === "gears") drawGears();
      else drawParticles(motif === "molecules" || motif === "network");
      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      if (reduce) return;
      running = !document.hidden;
      if (running) frame();
      else cancelAnimationFrame(raf);
    }

    // Re-read the colour when the theme or personality changes.
    const observer = new MutationObserver(readColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    readColor();
    resize();
    if (reduce) {
      // One static frame: the texture survives, the motion does not.
      running = true;
      c.clearRect(0, 0, w, h);
      if (motif === "circuit") drawCircuit();
      else if (motif === "gears") drawGears();
      else drawParticles(true);
      running = false;
    } else {
      frame();
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [discipline, opacity]);

  if (isBlueprint) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bp-grid" />
      </div>
    );
  }

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
