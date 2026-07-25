"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { EngineeringBackground } from "@/components/engineering-background";

/**
 * Hero background that prefers a looping engineering video, and falls back to
 * the lightweight animated canvas when no video is available.
 *
 * To use a video: drop a royalty-free clip at `public/videos/hero.mp4`
 * (e.g. a free engineering loop from pexels.com/videos or coverr.co). It will
 * automatically fade in; if the file is missing, the canvas animation shows.
 */
export function HeroBackground() {
  const [videoReady, setVideoReady] = useState(false);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {!videoReady && <EngineeringBackground />}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        onError={() => setVideoReady(false)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
          videoReady ? "opacity-40" : "opacity-0",
        )}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
        <source src="/videos/hero.webm" type="video/webm" />
      </video>
    </div>
  );
}
