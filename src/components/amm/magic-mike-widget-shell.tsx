"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Send, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { brandPackAssets } from "./brand-pack-assets";
import { MagicMikeAnswerReveal } from "./magic-mike-answer-reveal";
import type { AvatarState } from "./magic-mike-avatar";

export type WidgetVariant = "idle" | "thinking" | "answer" | "lead";

interface WidgetMessage {
  from: "mike" | "user";
  text: string;
}

interface MagicMikeWidgetShellProps {
  variant?: WidgetVariant;
  state?: AvatarState;
  /** Initial conversation. Live HTML; never bake answer text into an image. */
  messages?: WidgetMessage[];
  /** Quick prompt chips shown above the input. */
  prompts?: string[];
  /** Optional answer card body for the "answer" variant. */
  answer?: React.ReactNode;
  /** Lead capture card body for the "lead" variant. */
  lead?: React.ReactNode;
  /** Hide the input row when the widget is in a static demo. */
  hideInput?: boolean;
  /** Close button handler. If omitted the X is not rendered. */
  onClose?: () => void;
  className?: string;
}

const DEFAULT_MESSAGES: WidgetMessage[] = [
  {
    from: "mike",
    text:
      "Hi, I'm Mike Eatmon at Our Town Properties. Ask me about selling, buying, or a preliminary home value range for your Wilson-area home.",
  },
];

// Compliance-rewritten prompt chips. The kit prototype shipped with the
// direct-purchase chip phrased in a way we cannot use in public UI; the
// safe phrasing is "Request a direct-purchase review" per the funnel copy
// floor.
const DEFAULT_PROMPTS = [
  "What's my home worth?",
  "Should I sell now?",
  "Request a direct-purchase review",
];

/**
 * MagicMikeWidgetShell — visual surface that matches the brand kit's chat
 * widget concept (07_developer_implementation/magic_mike_widget_prototype.html)
 * but rendered as React + Tailwind with compliant copy.
 *
 * Components used here mirror the kit's recommended structure:
 *   - header     → avatar + name + cyan status pulse
 *   - body       → MessageList + (AnswerReveal | LeadCapture)
 *   - chips      → PromptChips
 *   - input row  → input + send
 *
 * All copy is live HTML. No baked text from concept imagery.
 */
export function MagicMikeWidgetShell({
  variant = "idle",
  state,
  messages = DEFAULT_MESSAGES,
  prompts = DEFAULT_PROMPTS,
  answer,
  lead,
  hideInput = false,
  onClose,
  className,
}: MagicMikeWidgetShellProps) {
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const effectiveState: AvatarState =
    state ??
    (variant === "thinking"
      ? "thinking"
      : variant === "answer"
        ? "explaining"
        : variant === "lead"
          ? "cta"
          : "idle");

  return (
    <section
      data-testid="amm-widget-shell"
      data-variant={variant}
      data-state={effectiveState}
      aria-label="Ask Magic Mike chat widget"
      className={cn(
        "relative w-full max-w-[420px] rounded-[28px] border border-gold-400/30 overflow-hidden",
        "bg-gradient-to-b from-[#161410]/96 to-[#060503]/96 backdrop-blur-md",
        className
      )}
      style={{
        boxShadow:
          "0 40px 120px rgba(0,0,0,0.70), 0 0 60px rgba(212,160,23,0.12), 0 0 0 1px rgba(212,160,23,0.08)",
      }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3.5 border-b border-gold-400/20 bg-[#0F0D08]/60 backdrop-blur-sm">
        <div
          className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden ring-2 ring-gold-400/50 bg-[#0B0B0B]"
          style={{ boxShadow: "0 0 20px rgba(212,160,23,0.30)" }}
        >
          <Image
            src={brandPackAssets.mike.avatar128}
            alt="Mike Eatmon"
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold tracking-tight text-[#F5F0E8] leading-tight">
            Magic Mike
          </p>
          <p
            data-testid="amm-widget-status"
            className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#B8B8B8]"
          >
            {variant === "thinking" ? (
              <>
                <span className="inline-flex items-center gap-[3px]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-400/70 motion-safe:animate-bounce" style={{ animationDelay: "0s" }} />
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-400/70 motion-safe:animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-400/70 motion-safe:animate-bounce" style={{ animationDelay: "0.30s" }} />
                </span>
                Thinking…
              </>
            ) : (
              <>
                <span className="status-online relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/55 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Online · AI-assisted
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className="text-slate-500 hover:text-[#F5F0E8] transition-colors p-1.5"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-[#F5F0E8] transition-colors p-1.5"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      {/* Body */}
      <div className="relative min-h-[440px] px-4 pt-4 pb-4">
        {/* Subtle gold smoke wash */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-16 h-52 pointer-events-none opacity-55 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(245,215,110,0.55), transparent 65%)",
            transform: "translateY(20px)",
          }}
        />

        <div
          className="relative max-h-[380px] overflow-y-auto scrollbar-luxury space-y-3"
          data-testid="amm-widget-messages"
        >
          {messages.map((m, i) => (
            <Bubble key={i} from={m.from}>
              {m.text}
            </Bubble>
          ))}
          {pendingPrompt && (
            <Bubble from="user">{pendingPrompt}</Bubble>
          )}
          {variant === "thinking" && (
            <Bubble from="mike">
              <span aria-label="Thinking" className="flex items-center gap-1 py-0.5">
                <Dot delay={0} />
                <Dot delay={0.16} />
                <Dot delay={0.32} />
              </span>
            </Bubble>
          )}
        </div>

        {variant === "answer" && answer && (
          <MagicMikeAnswerReveal className="mt-4">{answer}</MagicMikeAnswerReveal>
        )}

        {variant === "lead" && lead && (
          <div
            data-testid="amm-widget-lead"
            className="mt-4 rounded-2xl border border-gold-400/35 bg-[#0B0B0B]/95 p-4 shadow-[0_18px_45px_-12px_rgba(212,175,55,0.45)]"
          >
            {lead}
          </div>
        )}

        {/* Prompt chips */}
        {prompts.length > 0 && (
          <div
            data-testid="amm-widget-chips"
            className="relative mt-5 flex flex-wrap gap-2"
          >
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPendingPrompt(p)}
                className="rounded-xl border border-gold-400/20 bg-[#0F0D08]/80 px-3 py-2 text-[12px] font-medium text-[#C8C4BC] hover:border-gold-400/45 hover:bg-gold-400/[0.06] transition-all"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 0 16px rgba(212,160,23,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        {!hideInput && (
          <div className="relative mt-4 flex items-center gap-2">
            <input
              type="text"
              aria-label="Ask Magic Mike a question"
              placeholder="Type your question…"
              className="flex-1 min-w-0 h-11 rounded-full border border-white/[0.10] bg-[#0A0805]/80 px-4 text-[14px] text-[#F5F0E8] placeholder:text-slate-500 focus:outline-none focus:border-gold-400/45 transition-all"
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.boxShadow =
                  "0 0 24px rgba(212,160,23,0.10)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
              }}
            />
            <button
              type="button"
              aria-label="Send"
              className="btn-gold-premium h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-[#F5D76E] via-[#D4AF37] to-[#B8860B] text-[#050505] grid place-items-center shadow-[0_4px_20px_rgba(212,160,23,0.35)] hover:shadow-[0_4px_28px_rgba(212,160,23,0.55)] transition-all active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Bubble({
  from,
  children,
}: {
  from: "mike" | "user";
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid={`amm-widget-bubble-${from}`}
      className={cn(
        "flex flex-col gap-1",
        from === "user" ? "items-end" : "items-start"
      )}
    >
      <p
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 text-[13px] leading-[1.6]",
          from === "mike"
            ? "bubble-mike bg-black/55 border border-white/[0.08] text-[#F5F0E8]"
            : "bubble-user border border-gold-400/35 text-[#F5F0E8]"
        )}
      >
        {children}
      </p>
      <span className="text-[10px] text-slate-600 px-1">• just now</span>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-2 w-2 rounded-full bg-gold-400/70",
        delay === 0
          ? "typing-dot-1"
          : delay === 0.16
            ? "typing-dot-2"
            : "typing-dot-3"
      )}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
