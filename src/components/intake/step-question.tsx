"use client";

import { MapPin, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StepQuestionProps {
  question: string;
  address: string;
  onQuestionChange: (q: string) => void;
  onAddressChange: (a: string) => void;
  onNext: () => void;
}

export function StepQuestion({
  question,
  address,
  onQuestionChange,
  onAddressChange,
  onNext,
}: StepQuestionProps) {
  const canProceed = question.trim().length > 0 || address.trim().length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canProceed) onNext();
  };

  return (
    <div className="pt-2">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-cream mb-5 leading-snug">
        What&apos;s on your mind?
      </h2>

      {/* Chat-style message input */}
      <div
        className="rounded-2xl border border-gold-400/20 bg-[#0D0B08]/90 overflow-hidden"
        style={{
          boxShadow: "0 0 0 1px rgba(212,160,23,0.06), 0 16px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Helper prompt examples as inline chips */}
        <div
          data-testid="helper-prompt-examples"
          className="px-4 pt-4 pb-2 flex flex-wrap gap-2"
        >
          {[
            "What is my Wilson home worth?",
            "Is now a good time to sell?",
            "What should I know before buying in Wilson?",
          ].map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onQuestionChange(ex)}
              className="rounded-full border border-gold-400/15 bg-gold-400/[0.05] px-3 py-1 text-[11px] text-slate-400 hover:text-gold-300 hover:border-gold-400/30 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        <textarea
          data-testid="ask-question-textarea"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder="Type your question here — I'll review it personally and follow up with a real answer."
          className={cn(
            "w-full bg-transparent",
            "px-4 py-3 text-cream placeholder:text-slate-600",
            "text-sm leading-relaxed resize-none",
            "focus:outline-none border-0"
          )}
          aria-label="Your question"
          autoFocus
        />

        <div className="h-px bg-gradient-to-r from-transparent via-gold-400/10 to-transparent mx-4" />

        {/* Address + Send row */}
        <div className="flex items-center gap-2 px-3 py-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gold-400/40" />
            <input
              data-testid="ask-address-input"
              type="text"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="Property address (optional)"
              autoComplete="street-address"
              className={cn(
                "w-full rounded-xl border border-white/[0.06] bg-white/[0.03]",
                "pl-8 pr-3 py-2 text-xs text-cream placeholder:text-slate-600",
                "focus:outline-none focus:border-gold-400/30 transition-colors"
              )}
              aria-label="Property address"
            />
          </div>

          <button
            type="button"
            data-testid="ask-continue-button"
            onClick={onNext}
            disabled={!canProceed}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-midnight shrink-0",
              "transition-all duration-200",
              canProceed
                ? "bg-gold-400 hover:bg-gold-300 shadow-lg shadow-gold-400/20 hover:shadow-gold-400/30 active:scale-95"
                : "bg-gold-400/50 cursor-not-allowed opacity-60"
            )}
          >
            Send
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-600 text-center">
        Free · No account required · ⌘↵ to send
      </p>
    </div>
  );
}
