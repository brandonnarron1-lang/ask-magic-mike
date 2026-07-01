import { cn } from "@/lib/utils/cn";

interface CinematicBgProps {
  src: string;
  alt?: string;
  overlayOpacity?: number;
  className?: string;
  priority?: boolean;
}

/**
 * CinematicBg — absolute-positioned cinematic background layer.
 *
 * Renders the SVG/webp asset as a CSS background-image so it degrades
 * gracefully when the file is absent (the underlying BrandShell CSS gradient
 * layer takes over). Swap the .svg src for a generated .webp/png when real
 * cinematic stills arrive — nothing else changes.
 *
 * Safe zones: the gradient overlay (default 50% opacity) keeps foreground
 * text legible regardless of what the asset contains.
 */
export function CinematicBg({
  src,
  alt = "",
  overlayOpacity = 0.5,
  className,
}: CinematicBgProps) {
  const overlayStyle = {
    background: `rgba(8,8,6,${overlayOpacity})`,
  };

  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
    >
      {/* Asset layer */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url('${src}')`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
        role="img"
        aria-label={alt || undefined}
      />

      {/* Readability overlay — darkens image so HTML text stays legible */}
      <div className="absolute inset-0" style={overlayStyle} />

      {/* Bottom vignette — transitions smoothly into page content below hero */}
      <div
        className="absolute bottom-0 inset-x-0 h-64"
        style={{
          background:
            "linear-gradient(to top, #080806 0%, rgba(8,8,6,0.8) 40%, transparent 100%)",
        }}
      />
    </div>
  );
}
