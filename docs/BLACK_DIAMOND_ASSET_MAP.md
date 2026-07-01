# Black Diamond Asset Map

Cinematic visual asset system for Ask Magic Mike. All assets live in `public/assets/black-diamond/`.
The implementation uses `CinematicBg` (`src/components/amm/cinematic-bg.tsx`) as a CSS background-image layer beneath the existing `BrandShell` / `MagicBackdrop` gradient system.

When real generated images arrive, drop the `.webp` file into this directory at the path listed below — no code changes required.

---

## Asset Inventory

### hero-cinematic.svg / hero-cinematic.webp
| Field | Value |
|---|---|
| **Route** | `/` (homepage) |
| **Component** | `src/components/landing/hero-section.tsx` → `<CinematicBg>` |
| **Overlay** | 0.38 (lighter — lets horizon detail show through) |
| **Crop notes** | Safe zone: upper 65% for headline + input; lower 35% = roofline abstraction |
| **Alt text** | Decorative (empty) |
| **Fallback** | CSS radial gradient system in `HeroSection` |
| **Implementation** | ✅ Wired |
| **Real asset spec** | 2400×1350 16:9 webp |

**Generation prompt (ChatGPT / Firefly):**
> Cinematic luxury real estate photography background, Wilson North Carolina atmosphere, ultra-dark near-black background (#080806), warm gold light rays emanating from upper-left, subtle abstract roofline silhouette at bottom third, ruby ember glow lower-right, fine horizontal scan-line texture at 2% opacity, no text, no people, no cartoon elements, 16:9 2400×1350, photorealistic style with abstract light treatment

---

### ask-interface.svg / ask-interface.webp
| Field | Value |
|---|---|
| **Route** | `/ask` |
| **Component** | `src/components/intake/intake-shell.tsx` (not yet wired — Phase 2) |
| **Overlay** | 0.50 |
| **Crop notes** | Safe zone: right 60% for question input form |
| **Alt text** | Decorative (empty) |
| **Fallback** | `IntakeShell` base background (`bg-[#0A0A0A]`) |
| **Implementation** | 🔜 Phase 2 (requires IntakeShell prop thread) |
| **Real asset spec** | 2400×1350 16:9 webp |

**Generation prompt:**
> Premium dark glass AI interface background, near-black deep space atmosphere, warm gold circular intelligence glow on left third, subtle horizontal gold scan-line effect (2% opacity), dark glass panel reflection effect on right side, abstract ambient warmth, no text, no faces, no UI chrome, cinematic mood, 16:9 2400×1350

---

### value-funnel.svg / value-funnel.webp
| Field | Value |
|---|---|
| **Route** | `/value` |
| **Component** | `src/components/campaign/value-hero.tsx` → `<BrandShell cinematicSrc>` |
| **Overlay** | 0.42 |
| **Crop notes** | Safe zone: left 55% for address input + results; abstract property + map elements sit right/lower |
| **Alt text** | Decorative (empty) |
| **Fallback** | BrandShell CSS gradient system |
| **Implementation** | ✅ Wired |
| **Real asset spec** | 2400×1350 16:9 webp |

**Generation prompt:**
> Upscale home valuation analytics background, abstract property map coordinate grid (very low opacity gold lines), elegant house silhouette outline lower-right, radar concentric rings in gold at 4% opacity, black base (#080806), gold light bloom upper-left, cinematic property intelligence mood, no text, no MLS screens, no appraisal claims, no fake data, 16:9 2400×1350

---

### distribution-network.svg / distribution-network.webp
| Field | Value |
|---|---|
| **Route** | `/distribution` |
| **Component** | `src/app/(campaign)/distribution/page.tsx` → `<BrandShell cinematicSrc>` |
| **Overlay** | 0.44 |
| **Crop notes** | Safe zone: upper-left 40% for heading + hero copy; network nodes fill full frame |
| **Alt text** | Decorative (empty) |
| **Fallback** | BrandShell CSS gradient system |
| **Implementation** | ✅ Wired |
| **Real asset spec** | 2400×1350 16:9 webp |

**Generation prompt:**
> Abstract digital network visualization, central gold node representing a real estate AI widget, five connected peripheral nodes suggesting Facebook/Instagram/Email/QR/Website channels, gold dashed connection lines radiating outward, deep black background (#080806), node accent colors (blue, orange, green, purple, teal) at very low opacity, cinematic depth, no text or logos, 16:9 2400×1350

---

### campaign-generator.svg / campaign-generator.webp
| Field | Value |
|---|---|
| **Route** | `/campaigns` |
| **Component** | `src/app/(campaign)/campaigns/page.tsx` → `<BrandShell cinematicSrc>` |
| **Overlay** | 0.44 |
| **Crop notes** | Safe zone: left sidebar column for preset nav; center/right for card stack art |
| **Alt text** | Decorative (empty) |
| **Fallback** | BrandShell CSS gradient system |
| **Implementation** | ✅ Wired |
| **Real asset spec** | 2400×1350 16:9 webp |

**Generation prompt:**
> Premium creative marketing command studio background, dark black surface, three abstract campaign card shapes at slight angles (gold border outlines, 15% opacity), fine horizontal content lines inside cards suggesting copy blocks, floating badge shapes, gold gradient wash upper-left, ruby accent lower-right, studio creative atmosphere, no readable text, no faces, 16:9 2400×1350

---

### admin-command.svg / admin-command.webp
| Field | Value |
|---|---|
| **Route** | `/admin/*` |
| **Component** | Admin layout (not yet wired — admin uses separate shell) |
| **Overlay** | 0.55 (higher — keeps data readable) |
| **Crop notes** | Safe zone: entire frame; dashboard elements are purely atmospheric |
| **Alt text** | Decorative (empty) |
| **Fallback** | Admin CSS base styles |
| **Implementation** | 🔜 Phase 2 (admin shell) |
| **Real asset spec** | 2400×1350 16:9 webp |

**Generation prompt:**
> Black and gold data dashboard background abstraction, horizontal lead routing bar charts in warm gold at 30% opacity, subtle dashboard grid structure, heat-map gradient (amber to ruby) in lower third, cinematic data intelligence mood, coordinate grid lines in gold at 2% opacity, no text, no readable numbers, pure atmospheric dashboard feel, 16:9 2400×1350

---

## Social / Mobile Crops

| Asset | Spec | Status |
|---|---|---|
| `social-vertical.webp` | 1080×1350 (4:5) | 🔜 Crop from hero-cinematic |
| `mobile-hero.webp` | 1080×1920 (9:16) | 🔜 Crop from hero-cinematic |

For social/mobile crops: use the generated hero-cinematic.webp, crop to the specified dimensions centering on the upper-left light source. Safe text zone = upper 55%.

---

## Implementation Status

| Asset | SVG Placeholder | Wired | Real Asset |
|---|---|---|---|
| hero-cinematic | ✅ | ✅ homepage | ❌ needs generation |
| ask-interface | ✅ | 🔜 Phase 2 | ❌ needs generation |
| value-funnel | ✅ | ✅ /value | ❌ needs generation |
| distribution-network | ✅ | ✅ /distribution | ❌ needs generation |
| campaign-generator | ✅ | ✅ /campaigns | ❌ needs generation |
| admin-command | ✅ | 🔜 Phase 2 | ❌ needs generation |
| social-vertical | ❌ | ❌ | ❌ needs generation |
| mobile-hero | ❌ | ❌ | ❌ needs generation |

---

## How to Add Real Generated Assets

1. Generate assets using the prompts above (ChatGPT DALL-E 3 or Adobe Firefly on claude.ai web)
2. Export at 2400×1350 `.webp` (quality 85) + `.png` fallback
3. Drop into `public/assets/black-diamond/` at the paths listed above
4. No code changes needed — `CinematicBg` will serve the `.webp` automatically when present
5. Update this table's "Real Asset" column

---

## CinematicBg Component API

```tsx
// src/components/amm/cinematic-bg.tsx
<CinematicBg
  src="/assets/black-diamond/hero-cinematic.svg"  // or .webp
  overlayOpacity={0.38}   // 0 = transparent, 1 = fully black overlay
  alt=""                  // decorative = empty string (default)
/>
```

## BrandShell Integration

```tsx
<BrandShell
  cinematicSrc="/assets/black-diamond/distribution-network.svg"
  cinematicOverlay={0.44}
>
  {children}
</BrandShell>
```
