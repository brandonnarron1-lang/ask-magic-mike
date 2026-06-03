import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { brandColors, ammTokens } from "./tokens";
import { brandPackAssets } from "./brand-pack-assets";

/**
 * BrandKitShowcase — internal reference surface that renders every brand
 * pack v2 asset and token so we can prove the kit is actually in the
 * repo. NOT a customer-facing page; mounted at `/widget-preview` with
 * `robots: { index: false, follow: false }`.
 */
export function BrandKitShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-10", className)}>
      <ColorRow />
      <ExpressionRow />
      <ActionRow />
      <MotionRow />
      <BrandBoardRow />
      <SocialRow />
    </div>
  );
}

function ColorRow() {
  const swatches: Array<[keyof typeof brandColors, string]> = [
    ["black", "Page base"],
    ["charcoal", "Surface"],
    ["panel", "Card"],
    ["gold", "Primary accent"],
    ["goldSoft", "Hover"],
    ["goldDeep", "Shadow"],
    ["ruby", "Urgency"],
    ["rubyDeep", "Shadow"],
    ["cyanAI", "AI status"],
    ["offWhite", "Body text"],
    ["gray", "Secondary text"],
  ];
  return (
    <section data-testid="kit-color-row">
      <Heading>Brand tokens — `06_brand_system/json/ask-magic-mike-brand-tokens.json`</Heading>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {swatches.map(([key, label]) => (
          <div
            key={key}
            className="rounded-xl border border-white/10 bg-[#0F131A]/85 p-3"
          >
            <span
              aria-hidden="true"
              className="block h-14 w-full rounded-md border border-white/8"
              style={{ backgroundColor: brandColors[key] }}
            />
            <p className="mt-2 text-[12.5px] font-semibold text-[#F4F4F4]">
              {key}
            </p>
            <p className="text-[11.5px] text-slate-300 font-mono">
              {brandColors[key]}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExpressionRow() {
  const expressions: Array<{
    src: string;
    name: string;
    note?: string;
  }> = [
    { src: brandPackAssets.expressions.welcome, name: "welcome" },
    { src: brandPackAssets.expressions.thinkingChin, name: "thinkingChin" },
    { src: brandPackAssets.expressions.explaining, name: "explaining" },
    { src: brandPackAssets.expressions.confident, name: "confident" },
    { src: brandPackAssets.expressions.friendly, name: "friendly" },
    { src: brandPackAssets.expressions.lookingSide, name: "lookingSide" },
    {
      src: brandPackAssets.expressions.thinkingHandsConcept,
      name: "thinkingHands",
      note: "concept · baked footer label · not used in primary UI",
    },
  ];
  return (
    <section data-testid="kit-expression-row">
      <Heading>Avatar expressions — `03_avatar_concept_stills/expressions/`</Heading>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {expressions.map((e) => (
          <ConceptTile
            key={e.name}
            src={e.src}
            name={e.name}
            note={e.note ?? "clean crop"}
            aspect="aspect-[151/208]"
          />
        ))}
      </div>
    </section>
  );
}

function ActionRow() {
  return (
    <section data-testid="kit-action-row">
      <Heading>Avatar actions — `03_avatar_concept_stills/actions/`</Heading>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ConceptTile
          src={brandPackAssets.actions.explaining}
          name="explaining"
          note="clean crop"
          aspect="aspect-[3/4]"
        />
        <ConceptTile
          src={brandPackAssets.actions.answerAppearsConcept}
          name="answerAppears"
          note="concept · baked footer · ref only"
          aspect="aspect-[3/4]"
        />
        <ConceptTile
          src={brandPackAssets.mike.heroCloseup}
          name="heroCloseup"
          note="primary close-up concept"
          aspect="aspect-[360/440]"
        />
        <ConceptTile
          src={brandPackAssets.hero.wordmarkConcept}
          name="wordmarkConcept"
          note="conceptual lockup · not a logo replacement"
          aspect="aspect-square"
        />
      </div>
    </section>
  );
}

function MotionRow() {
  return (
    <section data-testid="kit-motion-row">
      <Heading>Motion storyboards — `05_motion_storyboards/`</Heading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ConceptTile
          src={brandPackAssets.motion.widgetStateSequence}
          name="widgetStateSequence"
          note="kit GIF · reference for state transitions"
          aspect="aspect-video"
          unoptimized
        />
        <ConceptTile
          src={brandPackAssets.motion.walkCycleSprite}
          name="walkCycleSprite"
          note="5-frame walk cycle · for external generation"
          aspect="aspect-[5/1]"
        />
      </div>
    </section>
  );
}

function BrandBoardRow() {
  return (
    <section data-testid="kit-board-row">
      <Heading>Selected board — `01_selected_direction/`</Heading>
      <div className="grid grid-cols-1 gap-3">
        <ConceptTile
          src={brandPackAssets.brandBoard.selectedV2Web}
          name="brandBoardV2"
          note="canonical visual direction"
          aspect="aspect-[1536/1024]"
        />
        <ConceptTile
          src={brandPackAssets.brandBoard.elementsStrip}
          name="brandElementsStrip"
          note="sparkle · smoke · ruby · button direction"
          aspect="aspect-[1536/75]"
        />
      </div>
    </section>
  );
}

function SocialRow() {
  return (
    <section data-testid="kit-social-row">
      <Heading>Social ad templates — `08_social_ad_templates/`</Heading>
      <p className="mb-3 text-[12.5px] text-slate-300">
        Reference-only. Baked copy must be replaced with compliance-safe
        language before any paid run — see
        `docs/ask-magic-mike-social-assets-plan.md`.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ConceptTile
          src={brandPackAssets.social.homeValueFeed}
          name="homeValueFeed"
          note="1080×1350 · feed"
          aspect="aspect-[4/5]"
        />
        <ConceptTile
          src={brandPackAssets.social.cashOfferFeed}
          name="cashOfferFeed"
          note="1080×1350 · BAKED COPY MUST BE REWRITTEN before paid use"
          aspect="aspect-[4/5]"
        />
        <ConceptTile
          src={brandPackAssets.social.chatStory}
          name="chatStory"
          note="1080×1920 · story"
          aspect="aspect-[9/16]"
        />
        <ConceptTile
          src={brandPackAssets.social.sellerStory}
          name="sellerStory"
          note="1080×1920 · story"
          aspect="aspect-[9/16]"
        />
      </div>
    </section>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className={cn(ammTokens.headlineDisplay, "text-[20px] mb-3")}>
      {children}
    </h2>
  );
}

function ConceptTile({
  src,
  name,
  note,
  aspect,
  unoptimized,
}: {
  src: string;
  name: string;
  note: string;
  aspect: string;
  unoptimized?: boolean;
}) {
  return (
    <figure className="rounded-xl border border-white/[0.09] bg-white/[0.025] p-2">
      <div className={cn("relative w-full overflow-hidden rounded-lg bg-[#0B0B0B]", aspect)}>
        <Image
          src={src}
          alt={`Concept reference: ${name}`}
          fill
          sizes="(max-width: 768px) 50vw, 240px"
          className="object-contain"
          unoptimized={unoptimized}
        />
      </div>
      <figcaption className="mt-2 text-[12px] text-[#F4F4F4]">
        <span className="font-semibold">{name}</span>
        <span className="block text-[11px] text-slate-400">{note}</span>
      </figcaption>
    </figure>
  );
}
