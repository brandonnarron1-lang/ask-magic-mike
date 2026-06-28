"use client";

import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="pt-2">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-cream mb-2 leading-snug">
        What do you want to know?
      </h2>
      <p className="text-sm text-slate-400 mb-7 leading-relaxed">
        Ask anything about buying, selling, or your home&apos;s value in Wilson
        or Eastern NC. Mike&apos;s team reviews each answer.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-[10.5px] font-semibold text-slate-400 mb-2 uppercase tracking-label">
            Your question
          </label>
          {/* Helper prompt examples */}
          <p
            data-testid="helper-prompt-examples"
            className="text-xs text-slate-500 mb-2 leading-relaxed"
          >
            Examples:{" "}
            <span className="text-slate-400 italic">&ldquo;What is my Wilson home worth?&rdquo;</span>
            {" · "}
            <span className="text-slate-400 italic">&ldquo;Is now a good time to sell?&rdquo;</span>
            {" · "}
            <span className="text-slate-400 italic">&ldquo;What should I know before buying in Wilson?&rdquo;</span>
          </p>
          <textarea
            data-testid="ask-question-textarea"
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            rows={4}
            placeholder="What's the market like? Should I sell now? What's my home worth in Wilson?"
            className={cn(
              "w-full rounded-xl border border-white/[0.08] bg-[#0B0E14]/85",
              "px-4 py-3 text-cream placeholder:text-slate-500",
              "text-sm leading-relaxed resize-none",
              "focus:outline-none focus:border-gold-400/50 focus:ring-2 focus:ring-gold-400/[0.10] focus:shadow-[0_0_20px_-4px_rgba(212,160,23,0.18)] transition-all duration-200"
            )}
            aria-label="Your question"
          />
        </div>

        <div>
          <label className="block text-[10.5px] font-semibold text-slate-400 mb-2 uppercase tracking-label">
            Property address{" "}
            <span className="normal-case text-slate-600">(optional)</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-400/55" />
            <input
              data-testid="ask-address-input"
              type="text"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="123 Nash St NW, Wilson, NC 27896"
              autoComplete="street-address"
              className={cn(
                "w-full rounded-xl border border-white/[0.08] bg-[#0B0E14]/85",
                "pl-10 pr-4 py-3 text-cream placeholder:text-slate-500",
                "text-sm focus:outline-none focus:border-gold-400/50 focus:ring-2 focus:ring-gold-400/[0.10] focus:shadow-[0_0_20px_-4px_rgba(212,160,23,0.18)] transition-all duration-200"
              )}
              aria-label="Property address"
            />
          </div>
        </div>
      </div>

      <Button
        data-testid="ask-continue-button"
        variant="primary"
        size="lg"
        onClick={onNext}
        disabled={!canProceed}
        className="mt-7 w-full"
      >
        Continue
      </Button>
    </div>
  );
}
