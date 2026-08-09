"use client";

import { useEffect, useRef, useState } from "react";
import type { AvatarPresentation } from "@prisma/client";
import type { Discipline } from "@/lib/project-hub";
import { DISCIPLINE_SCENES, SCENE_DESCRIPTION } from "./scenes";

/**
 * The dashboard's hero scene.
 *
 * WHAT MAKES THIS CHEAP
 * There is no animation library, no canvas, no `requestAnimationFrame` loop
 * and no WebGL context. The whole thing is one inline SVG whose moving parts
 * are driven by CSS keyframes on `transform` and `opacity` — work the
 * compositor does on its own thread, off the main thread entirely. That is
 * why it can sit on the page a student keeps open for hours.
 *
 * It also costs nothing to download. The scene is part of the page's own
 * JavaScript, roughly 3 KB gzipped per discipline, against the 2–8 MB a
 * rigged glTF character would be. On the metered mobile data most of these
 * students are using, that difference is the entire argument.
 *
 * PAUSED WHEN NOBODY IS LOOKING
 * An `IntersectionObserver` sets `animation-play-state: paused` the moment the
 * scene scrolls out of view. Browsers already throttle animation in background
 * TABS; they do not pause work for content that has merely scrolled past, and
 * a decorative loop running under a page of tasks is pure battery cost on a
 * phone.
 */
export function AvatarScene({
  discipline,
  presentation,
  className,
  describe = true,
}: {
  discipline: Discipline;
  presentation: AvatarPresentation;
  className?: string;
  /**
   * Emit the text alternative. Turn this OFF where the surrounding control
   * already names the thing — in the Settings picker each scene sits inside a
   * radio label, and including the description there made every option's
   * accessible name the same 120-character sentence with the actual choice
   * ("Neutral") tacked on the end. Three identical mouthfuls to choose
   * between is worse than no description at all.
   */
  describe?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      // A small margin so it is already running by the time it is looked at,
      // rather than visibly starting as it enters.
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Scene = DISCIPLINE_SCENES[discipline] ?? DISCIPLINE_SCENES.GENERAL;

  return (
    <div
      ref={ref}
      className={`es-avatar ${visible ? "" : "es-avatar--paused"} ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 240 170"
        // Decorative. The scene says nothing the surrounding page does not
        // already say in text, and narrating a cartoon crane to someone using
        // a screen reader is noise. The description below is available to
        // anything that does want it.
        aria-hidden="true"
        focusable="false"
        className="es-avatar__svg"
        preserveAspectRatio="xMidYMax meet"
      >
        <Scene presentation={presentation} />
      </svg>
      {describe && <span className="sr-only">{SCENE_DESCRIPTION[discipline]}</span>}
    </div>
  );
}
