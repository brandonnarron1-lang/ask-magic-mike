import { cn } from "@/lib/utils/cn";

interface Step {
  number: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Start with your address",
    body: "Drop in your Wilson-area address. No account required.",
  },
  {
    number: "02",
    title: "Answer a few quick questions",
    body: "AI-assisted intake captures your timeline and what you're trying to decide.",
  },
  {
    number: "03",
    title: "Mike's team follows up with local guidance",
    body: "A real person at Our Town Properties reviews your details and reaches out.",
  },
];

interface HowItWorksProps {
  className?: string;
  /** Heading override. */
  heading?: string;
}

/**
 * HowItWorks — three numbered, equal-weight steps. Lives below the hero on
 * `/value`; reads as a quick reassurance band.
 */
export function HowItWorks({
  className,
  heading = "What happens next",
}: HowItWorksProps) {
  return (
    <section
      data-testid="how-it-works"
      className={cn("w-full", className)}
      aria-label={heading}
    >
      <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-gold-300 mb-3">
        {heading}
      </p>
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map((step) => (
          <li
            key={step.number}
            className="relative rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[28px] font-semibold text-gold-300 leading-none">
                {step.number}
              </span>
              <h4 className="text-[14.5px] font-semibold text-[#F7F1E8] leading-snug">
                {step.title}
              </h4>
            </div>
            <p className="mt-2 text-[13px] text-slate-200 leading-relaxed">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
