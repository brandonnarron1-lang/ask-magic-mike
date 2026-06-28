"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface QuestionInputProps {
  initialQuestion?: string;
  initialAddress?: string;
  onSubmit?: (question: string, address: string) => void;
  loading?: boolean;
  className?: string;
}

export function QuestionInput({
  initialQuestion = "",
  initialAddress = "",
  onSubmit,
  loading = false,
  className,
}: QuestionInputProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [address,  setAddress]  = useState(initialAddress);
  const [focused,  setFocused]  = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync if parent updates the initial question (chip tap)
  useEffect(() => { setQuestion(initialQuestion); }, [initialQuestion]);

  const canSubmit = question.trim().length > 0 || address.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit || loading) return;
    onSubmit?.(question.trim(), address.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl transition-all duration-300",
        "border",
        focused
          ? "border-gold-400/50 shadow-[0_0_40px_rgba(212,160,23,0.12)]"
          : "border-gold-400/15 shadow-xl shadow-black/40",
        "bg-[#0D0B08]/80 backdrop-blur-xl",
        className
      )}
    >
      {/* Top shimmer line when focused */}
      <div className={cn(
        "absolute inset-x-0 top-0 h-px rounded-t-2xl transition-opacity duration-300",
        "bg-gradient-to-r from-transparent via-gold-400/70 to-transparent",
        focused ? "opacity-100" : "opacity-0"
      )} />

      <div className="p-5 pb-4">
        {/* Header label */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-gold-400/70" />
          <span className="text-[10.5px] font-semibold tracking-label uppercase text-gold-400/70">
            Ask Magic Mike
          </span>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="What's on your mind? Home value, timing, affordability…"
          rows={3}
          className={cn(
            "w-full resize-none bg-transparent",
            "text-base leading-relaxed text-cream placeholder:text-slate-600",
            "focus:outline-none border-0 p-0"
          )}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-400/10 to-transparent mx-5" />

      {/* Bottom row */}
      <div className="flex items-center gap-3 p-4 pt-3.5">
        {/* Address */}
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-400/40" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Property address (optional)"
            className={cn(
              "w-full rounded-xl border border-white/[0.06] bg-white/[0.04]",
              "pl-9 pr-4 py-2.5 text-sm text-cream placeholder:text-slate-600",
              "focus:outline-none focus:border-gold-400/30 transition-colors"
            )}
          />
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-midnight",
            "transition-all duration-200 shrink-0",
            canSubmit && !loading
              ? "bg-gold-400 hover:bg-gold-300 shadow-lg shadow-gold-400/20 hover:shadow-gold-400/30 active:scale-95"
              : "bg-gold-400/30 text-midnight/40 cursor-not-allowed"
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-midnight/40 border-t-midnight animate-spin" />
              Routing…
            </span>
          ) : (
            <>
              Request Guidance
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <p className="px-5 pb-1.5 text-xs text-slate-700">
        ⌘ + Enter to submit · Free · No account required
      </p>
      <p
        data-testid="broker-reviewed-microcopy"
        className="px-5 pb-3.5 text-xs text-slate-500"
      >
        Broker-reviewed guidance from Our Town Properties. Not an appraisal.
      </p>

      {/* What happens next? trust panel */}
      <div
        data-testid="what-happens-next-panel"
        className="mx-5 mb-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
      >
        <p className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-2">
          What happens next?
        </p>
        <ol className="space-y-1.5">
          {([
            "Ask your question",
            "Mike reviews the request",
            "A local expert follows up if needed",
          ] as const).map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-400">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold-400/15 text-[9px] font-bold text-gold-400/80 mt-px">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
