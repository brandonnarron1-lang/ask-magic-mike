/** iOS native rerenders reproduced stale layout metrics after Dynamic Type
 * changed. Apply the OS's uncapped scale to layout AND glyph size exactly once;
 * disabling the second native multiplication is not disabling user scaling.
 * Android retains its verified native scaling. No fit-to-box or line limit. */
export function textScale(platform: string, fontScale: number, base: number) {
  if (!Number.isFinite(fontScale) || fontScale <= 0 || !Number.isFinite(base) || base <= 0) throw Error("valid_os_text_metrics_required");
  return platform === "ios"
    ? { allowFontScaling: false, style: { fontSize: base * fontScale } }
    : { allowFontScaling: true, style: {} };
}
