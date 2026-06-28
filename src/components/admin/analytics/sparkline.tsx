"use client";

import { cn } from "@/lib/utils/cn";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  "aria-label"?: string;
}

function buildPolyline(data: number[], w: number, h: number): string {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const innerH = h - pad * 2;
  const step = (w - pad * 2) / (data.length - 1);
  return data
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + innerH - ((v - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "currentColor",
  className,
  "aria-label": ariaLabel,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={cn("opacity-30", className)}
        aria-hidden={!ariaLabel}
        aria-label={ariaLabel}
        role={ariaLabel ? "img" : undefined}
      >
        <line
          x1="2" y1={height / 2} x2={width - 2} y2={height / 2}
          stroke={color} strokeWidth="1" strokeDasharray="3,3"
        />
      </svg>
    );
  }

  const points = buildPolyline(data, width, height);

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      aria-hidden={!ariaLabel}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
