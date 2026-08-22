import { useTranslations } from "next-intl";

export function WizardProgress({
  step,
  total,
}: {
  /** 0-based index of the step being shown. */
  step: number;
  total: number;
}) {
  const t = useTranslations("Wizard");
  const current = Math.min(step + 1, total);
  const label = t("stepOf", { current, total });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{label}</p>

      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={label}
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
