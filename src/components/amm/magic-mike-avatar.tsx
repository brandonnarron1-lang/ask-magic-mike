import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { brandPackAssets } from "./brand-pack-assets";

export type AvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "explaining"
  | "answerReveal"
  | "cta"
  | "success";

interface MagicMikeAvatarProps {
  state?: AvatarState;
  size?: "sm" | "md" | "lg";
  /** "subtle" adds a gentle gold pulse / cyan ping when state warrants it.
   *  "static" disables all motion regardless of prefers-reduced-motion. */
  motion?: "subtle" | "static";
  className?: string;
  /** Optional aria label override. */
  label?: string;
}

const SIZE_MAP: Record<NonNullable<MagicMikeAvatarProps["size"]>, {
  px: number;
  src: string;
  sizes: string;
}> = {
  sm: { px: 40, src: brandPackAssets.mike.avatar128, sizes: "40px" },
  md: { px: 64, src: brandPackAssets.mike.avatar128, sizes: "64px" },
  lg: { px: 88, src: brandPackAssets.mike.avatar256, sizes: "88px" },
};

/**
 * MagicMikeAvatar — the Mike circular trust anchor. Visual-only.
 *
 * `state` is exposed so future widget logic can render the right cue
 * (cyan AI pulse on `listening`/`thinking`, gold sparkle on
 * `answerReveal`/`success`). For now we render two CSS-only signals:
 *  - cyan ping on "listening" / "thinking"
 *  - gold pulse ring on "cta" / "success"
 * All motion is wrapped in `motion-safe:` so reduced-motion users see a
 * still avatar.
 */
export function MagicMikeAvatar({
  state = "idle",
  size = "md",
  motion: motionMode = "subtle",
  className,
  label = "Mike Eatmon, Our Town Properties",
}: MagicMikeAvatarProps) {
  const { px, src, sizes } = SIZE_MAP[size];
  const showAiPing =
    motionMode !== "static" && (state === "listening" || state === "thinking");
  const showGoldPulse =
    motionMode !== "static" && (state === "cta" || state === "success");

  return (
    <div
      data-testid="magic-mike-avatar"
      data-state={state}
      role="img"
      aria-label={label}
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: px, height: px }}
    >
      {showGoldPulse && (
        <span
          aria-hidden="true"
          className="absolute -inset-1 rounded-full ring-2 ring-gold-400/55 motion-safe:animate-pulse-gold"
        />
      )}
      <div className="relative h-full w-full rounded-full overflow-hidden border border-gold-400/35 bg-[#0B0B0B]">
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
          priority={size === "lg"}
        />
      </div>
      {showAiPing && (
        <span
          aria-hidden="true"
          className="absolute right-0 bottom-0 inline-flex h-3 w-3"
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400/55 motion-safe:animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full border border-cyan-300/80 bg-cyan-400" />
        </span>
      )}
    </div>
  );
}
