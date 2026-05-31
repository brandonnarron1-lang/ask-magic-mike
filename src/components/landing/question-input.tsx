"use client";

import { useState, useRef } from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

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
  const [address, setAddress] = useState(initialAddress);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!question.trim() && !address.trim()) return;
    onSubmit?.(question.trim(), address.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const canSubmit = question.trim().length > 0 || address.trim().length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-gold-400/20 bg-white/[0.04] p-5 backdrop-blur-sm",
        "shadow-xl shadow-black/40",
        className
      )}
    >
      {/* Question textarea */}
      <textarea
        ref={textareaRef}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's on your mind about buying or selling in Gainesville?"
        rows={3}
        className={cn(
          "w-full resize-none bg-transparent text-cream placeholder:text-slate-500",
          "text-base leading-relaxed focus:outline-none",
          "border-0 p-0"
        )}
      />

      {/* Divider */}
      <div className="my-3 h-px bg-gold-400/10" />

      {/* Address input + submit */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-400/50" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Property address (optional)"
            className={cn(
              "w-full rounded-lg border border-white/10 bg-white/5",
              "pl-9 pr-4 py-2.5 text-sm text-cream placeholder:text-slate-500",
              "focus:outline-none focus:border-gold-400/40 transition-colors"
            )}
          />
        </div>

        <Button
          variant="primary"
          size="md"
          loading={loading}
          disabled={!canSubmit || loading}
          onClick={handleSubmit}
          className="shrink-0"
        >
          Get My Answer
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-2 text-xs text-slate-600">
        Press ⌘ + Enter to submit · No account required
      </p>
    </div>
  );
}
