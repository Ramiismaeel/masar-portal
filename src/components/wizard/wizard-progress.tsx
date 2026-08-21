export function WizardProgress({
  step,
  total,
}: {
  /** 0-based index of the step being shown. */
  step: number;
  total: number;
}) {
  const current = Math.min(step + 1, total);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Step {current} of {total}
      </p>

      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Step ${current} of ${total}`}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index < current ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
