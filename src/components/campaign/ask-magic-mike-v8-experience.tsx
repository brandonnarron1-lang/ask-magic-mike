"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import styles from "./ask-magic-mike-v8-experience.module.css";

const V8_ASSETS = "/ask-magic-mike/v8";

/**
 * Top-level wrapper class that injects the V8 design tokens
 * (background, color, font-family, --amm-* variables). Wrap any V8
 * subtree in a `<div className={v8RootClass}>` to scope them.
 */
export const v8RootClass = styles.root;

export interface V8Chip {
  id: string;
  label: string;
  /** Optional override for the chat-card answer when this chip is active. */
  answer?: ReactNode;
}

export interface AskMagicMikeV8HeroProps {
  /** Eyebrow above the title (e.g. "Ask Magic Mike by Our Town Properties"). */
  eyebrow: ReactNode;
  /** First line of the headline (e.g. "Start with your address."). */
  titleLine1: ReactNode;
  /** Second line of the headline (gold gradient). */
  titleLine2: ReactNode;
  /** Lede paragraph (e.g. "Premium. Local. Intelligent."). */
  lede: ReactNode;
  /** Body paragraph; must include the compliance-grounded blurb. */
  body: ReactNode;
  /** Primary CTA (caller decides destination — usually scrolls to lead form). */
  primaryCta: ReactNode;
  /** Trust pill next to the CTA. */
  trustLine: ReactNode;
  /** Suggested questions shown as gold pill chips. */
  chips: V8Chip[];
  /** Initial chat-card answer when no chip is selected. */
  initialAnswer: ReactNode;
  /** Optional heading id (linked to title for aria-labelledby). */
  headingId?: string;
}

/**
 * Ask Magic Mike V8 hero — the luxury product page hero section.
 *
 * All copy is injected by the caller so the page-level component
 * remains the single source of truth for compliance-asserted strings.
 * The styles are scoped via CSS Module under `v8RootClass`.
 */
export function AskMagicMikeV8Hero({
  eyebrow,
  titleLine1,
  titleLine2,
  lede,
  body,
  primaryCta,
  trustLine,
  chips,
  initialAnswer,
  headingId,
}: AskMagicMikeV8HeroProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeChip = chips.find((c) => c.id === selectedId) ?? null;
  return (
    <section className={styles.hero} aria-labelledby={headingId}>
      <div className={styles.heroGrid}>
        <div className={styles.copy}>
          <Image
            className={styles.logo}
            src={`${V8_ASSETS}/ourtown-logo-gold.webp`}
            alt="Our Town Properties logo"
            width={280}
            height={64}
            priority
          />
          <div className={styles.kicker}>
            <span aria-hidden="true" /> {eyebrow}
          </div>
          <h1 id={headingId} className={styles.title}>
            <span>{titleLine1}</span>
            <strong>{titleLine2}</strong>
          </h1>
          <p className={styles.lede}>{lede}</p>
          <p className={styles.body}>{body}</p>
          <div className={styles.actions}>
            {primaryCta}
            <span className={styles.trust}>{trustLine}</span>
          </div>
          <div
            className={styles.chips}
            role="group"
            aria-label="Suggested questions"
          >
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={cn(
                  styles.chip,
                  selectedId === chip.id && styles.chipSelected
                )}
                aria-pressed={selectedId === chip.id}
                onClick={() => setSelectedId(chip.id)}
                data-testid={`v8-chip-${chip.id}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.stage} aria-hidden="true">
          <div className={styles.stageHalo} />
          <Image
            className={styles.portrait}
            src={`${V8_ASSETS}/mike-stage-portrait.webp`}
            alt=""
            width={600}
            height={690}
            priority
          />
          <div className={styles.chatCard}>
            <div className={styles.chatHead}>
              <Image
                src={`${V8_ASSETS}/mike-widget-avatar.webp`}
                alt=""
                width={44}
                height={44}
              />
              <div>
                <strong>Magic Mike</strong>
                <span>Online · ready to help</span>
              </div>
            </div>
            <p>
              {activeChip
                ? activeChip.label
                : "Ask me about your home value, timing, or selling options."}
            </p>
            <div className={styles.answer}>
              {activeChip?.answer ?? initialAnswer}
            </div>
          </div>
        </div>

        <aside
          className={styles.command}
          aria-label="Interactive avatar states preview"
        >
          <div className={styles.commandTitle}>Interactive avatar in action</div>
          <Image
            src={`${V8_ASSETS}/interactive-action-cards.webp`}
            alt="Magic Mike welcome, thinking, explaining, and answer-reveal states"
            width={520}
            height={342}
          />
          <div className={styles.commandMini}>
            <span>Welcome</span>
            <span>Thinking</span>
            <span>Explaining</span>
            <span>Answer</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

export interface AskMagicMikeV8SystemPanelsProps {
  poseRailAlt?: string;
  environmentRailAlt?: string;
  chatStatesAlt?: string;
  answerRevealAlt?: string;
}

/**
 * V8 system grid — Mike avatar pose rail, dark luxury environments,
 * chat widget states, and the answer-reveal state. Purely visual.
 */
export function AskMagicMikeV8SystemPanels({
  poseRailAlt = "Magic Mike avatar poses and expressions",
  environmentRailAlt = "Ask Magic Mike dark luxury environments",
  chatStatesAlt = "Ask Magic Mike chat widget states",
  answerRevealAlt = "Magic Mike answer reveal state",
}: AskMagicMikeV8SystemPanelsProps = {}) {
  return (
    <section
      className={styles.system}
      aria-label="Ask Magic Mike avatar and chat widget system"
    >
      <div className={styles.systemLeft}>
        <div className={cn(styles.panel, styles.panelWide)}>
          <div className={styles.panelLabel}>Avatar poses &amp; expressions</div>
          <Image
            src={`${V8_ASSETS}/pose-expression-rail.webp`}
            alt={poseRailAlt}
            width={1200}
            height={376}
          />
        </div>
        <div className={cn(styles.panel, styles.panelWide)}>
          <div className={styles.panelLabel}>Dark luxury environments</div>
          <Image
            src={`${V8_ASSETS}/environment-rail.webp`}
            alt={environmentRailAlt}
            width={1200}
            height={376}
          />
        </div>
      </div>
      <div className={styles.systemRight}>
        <div className={cn(styles.panel, styles.panelChat)}>
          <div className={styles.panelLabel}>Chat widget states</div>
          <Image
            src={`${V8_ASSETS}/chat-widget-states.webp`}
            alt={chatStatesAlt}
            width={760}
            height={476}
          />
        </div>
        <div className={cn(styles.panel, styles.panelAnswer)}>
          <div className={styles.panelLabel}>Answer reveal</div>
          <Image
            src={`${V8_ASSETS}/answer-reveal-action.webp`}
            alt={answerRevealAlt}
            width={760}
            height={476}
          />
        </div>
      </div>
    </section>
  );
}

export interface AskMagicMikeV8CloseProps {
  kicker: ReactNode;
  headline: ReactNode;
  body: ReactNode;
  cta: ReactNode;
}

/**
 * Final luxury close section — kicker, headline, supporting copy, CTA.
 */
export function AskMagicMikeV8Close({
  kicker,
  headline,
  body,
  cta,
}: AskMagicMikeV8CloseProps) {
  return (
    <section
      className={styles.close}
      aria-label="Ask Magic Mike final call to action"
    >
      <div>
        <span>{kicker}</span>
        <h2>{headline}</h2>
        <p>{body}</p>
      </div>
      {cta}
    </section>
  );
}

/**
 * Class names re-exported so callers can compose them on plain anchors
 * or buttons (e.g. the page-level "Ask Mike Now" CTA).
 */
export const v8ButtonClass = styles.button;
