"use client";

import { useEffect, useRef, useState } from "react";

export type RevealVariant =
  | "fade-up"
  | "fade-down"
  | "fade-in"
  | "scale-in"
  | "scale"
  | "slide-left"
  | "slide-right"
  | "blur-in";

const ANIMATION_CLASS: Record<RevealVariant, string> = {
  "fade-up":    "animate-fade-up",
  "fade-down":  "animate-fade-down",
  "fade-in":    "animate-fade-in",
  "scale-in":   "animate-scale-in",
  "scale":      "animate-scale-luxury",
  "slide-left": "animate-slide-left",
  "slide-right":"animate-slide-right",
  "blur-in":    "animate-blur-in",
};

export interface UseRevealOptions {
  threshold?: number;
  variant?: RevealVariant;
  delay?: number;
  once?: boolean;
}

export interface UseRevealResult {
  ref: React.RefObject<HTMLElement | null>;
  inView: boolean;
  animationClass: string;
  style: React.CSSProperties;
}

export function useReveal({
  threshold = 0.12,
  variant = "fade-up",
  delay = 0,
  once = true,
}: UseRevealOptions = {}): UseRevealResult {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin: "0px 0px -60px 0px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);

  const anim = ANIMATION_CLASS[variant];
  const animationClass = inView ? `motion-safe:${anim}` : "opacity-0";
  const style: React.CSSProperties = delay > 0 && inView ? { animationDelay: `${delay}ms` } : {};

  return { ref, inView, animationClass, style };
}

export function staggerDelay(index: number, base = 0, interval = 80): number {
  return base + index * interval;
}
