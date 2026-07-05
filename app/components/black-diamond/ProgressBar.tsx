type ProgressBarProps = {
  step: number;
  labels: string[];
};

export function ProgressBar({ step, labels }: ProgressBarProps) {
  const progress = Math.min(step, labels.length);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-[#d9ceb8]">
        <span>
          Step {progress} of {labels.length}
        </span>
        <span>{labels[progress - 1]}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#cda24a] transition-all"
          style={{ width: `${(progress / labels.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
