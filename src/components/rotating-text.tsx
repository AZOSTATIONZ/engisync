"use client";

import { useEffect, useState } from "react";

/** Cycles through phrases with a fade/slide animation. */
export function RotatingText({
  phrases,
  interval = 2800,
  className = "",
}: {
  phrases: string[];
  interval?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setI((v) => (v + 1) % phrases.length);
        setShow(true);
      }, 300);
    }, interval);
    return () => clearInterval(t);
  }, [phrases.length, interval]);

  return (
    <span
      className={`inline-block transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
      } ${className}`}
    >
      {phrases[i]}
    </span>
  );
}
