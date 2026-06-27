"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { useReveal, staggerDelay, type RevealVariant } from "@/hooks/use-reveal";

// ---------------------------------------------------------------------------
// Reveal — wraps any element with a scroll-triggered entrance animation
// ---------------------------------------------------------------------------

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  variant?: RevealVariant;
  delay?: number;
  threshold?: number;
  once?: boolean;
}

export function Reveal({
  as: Tag = "div",
  variant = "fade-up",
  delay = 0,
  threshold = 0.12,
  once = true,
  className,
  children,
  style,
  ...props
}: RevealProps) {
  const { ref, animationClass, style: animStyle } = useReveal({
    variant,
    delay,
    threshold,
    once,
  });

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(animationClass, className)}
      style={{ ...animStyle, ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// Stagger — maps children with ascending stagger delays
// ---------------------------------------------------------------------------

export interface StaggerProps {
  children: React.ReactNode;
  variant?: RevealVariant;
  base?: number;
  interval?: number;
  threshold?: number;
  className?: string;
  itemClassName?: string;
}

export function Stagger({
  children,
  variant = "fade-up",
  base = 0,
  interval = 80,
  threshold = 0.10,
  className,
  itemClassName,
}: StaggerProps) {
  const items = React.Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, i) => (
        <Reveal
          key={i}
          variant={variant}
          delay={staggerDelay(i, base, interval)}
          threshold={threshold}
          className={itemClassName}
        >
          {child}
        </Reveal>
      ))}
    </div>
  );
}
