"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import { saveQuestionStep } from "@/lib/actions/wizard";
import { EMPTY_WIZARD_STATE, STEP_IDENTITY } from "@/lib/wizard";
import {
  AGE_BANDS,
  ENGLISH_LEVELS,
  EXPERIENCE_LEVELS,
  GERMAN_LEVELS,
  MIN_POINTS_REQUIRED,
  POINT_FLAGS,
  calculatePoints,
  type AgeBand,
  type EnglishLevel,
  type ExperienceLevel,
  type GermanLevel,
  type PointFlag,
  type PointsAnswers,
} from "@/lib/points";
import { Button } from "@/components/ui/button";
import { pick } from "@/i18n/pick";
import type { Locale } from "@/i18n/locale";

type Option = {
  readonly value: string;
  readonly labelEn: string;
  readonly labelAr: string;
  readonly points: number;
};

type FlagOption = Option & {
  readonly hintEn?: string;
  readonly hintAr?: string;
};

function SubmitButton({ blocked }: { blocked: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Wizard");
  return (
    <Button type="submit" size="lg" loading={pending} disabled={blocked}>
      {pending ? t("saving") : t("saveAndFinish")}
    </Button>
  );
}

/** A labelled select whose options carry their own point values. */
function PointsSelect({
  name,
  label,
  hint,
  options,
  value,
  onChange,
  locale,
  error,
}: {
  name: string;
  label: string;
  hint?: string;
  options: readonly Option[];
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  error?: string;
}) {
  const t = useTranslations("Wizard");
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && (
        <span className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </span>
      )}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {pick(locale, option.labelEn, option.labelAr)}
            {option.points > 0
              ? ` — ${t("pointsSuffix", { points: option.points })}`
              : ""}
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

/**
 * The Chancenkarte § 20b points self-assessment.
 *
 * The running total is computed with the SAME calculatePoints() the Server
 * Action uses, never with arithmetic written here — if the two ever disagreed,
 * an applicant would be told they qualify and then blocked on submit, which is
 * worse than no calculator at all. The client total is display only; the
 * server recomputes it from the submitted values and is the real gate.
 */
export function PointsStep({
  applicationId,
  locale,
  defaults,
}: {
  applicationId: string;
  locale: Locale;
  defaults?: PointsAnswers;
}) {
  const [state, formAction] = useActionState(
    saveQuestionStep,
    EMPTY_WIZARD_STATE,
  );
  const t = useTranslations("Wizard");

  const [germanLevel, setGermanLevel] = useState<string>(
    defaults?.germanLevel ?? "none",
  );
  const [englishLevel, setEnglishLevel] = useState<string>(
    defaults?.englishLevel ?? "none",
  );
  const [experience, setExperience] = useState<string>(
    defaults?.experience ?? "none",
  );
  const [ageBand, setAgeBand] = useState<string>(defaults?.ageBand ?? "over40");
  const [flags, setFlags] = useState<PointFlag[]>(defaults?.flags ?? []);

  const result = calculatePoints({
    germanLevel: germanLevel as GermanLevel,
    englishLevel: englishLevel as EnglishLevel,
    experience: experience as ExperienceLevel,
    ageBand: ageBand as AgeBand,
    flags,
  });

  function toggleFlag(flag: PointFlag, checked: boolean) {
    setFlags((current) =>
      checked ? [...current, flag] : current.filter((f) => f !== flag),
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="applicationId" value={applicationId} />

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">
          {t("pointsLegend")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("pointsHint")}</p>
      </div>

      {/* The basic requirements sit OUTSIDE the points table — someone can
          score 10 here and still not qualify without a completed qualification
          and A1 German or B2 English. Saying so up front is the difference
          between a helpful calculator and a misleading one. */}
      <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        {t("pointsBasicNote")}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <PointsSelect
          name="germanLevel"
          label={t("germanLevel")}
          hint={t("germanLevelHint")}
          options={GERMAN_LEVELS}
          value={germanLevel}
          onChange={setGermanLevel}
          locale={locale}
          error={state.fieldErrors.germanLevel}
        />
        <PointsSelect
          name="englishLevel"
          label={t("englishLevel")}
          hint={t("englishLevelHint")}
          options={ENGLISH_LEVELS}
          value={englishLevel}
          onChange={setEnglishLevel}
          locale={locale}
          error={state.fieldErrors.englishLevel}
        />
        <PointsSelect
          name="experience"
          label={t("experience")}
          hint={t("experienceHint")}
          options={EXPERIENCE_LEVELS}
          value={experience}
          onChange={setExperience}
          locale={locale}
          error={state.fieldErrors.experience}
        />
        <PointsSelect
          name="ageBand"
          label={t("ageBand")}
          options={AGE_BANDS}
          value={ageBand}
          onChange={setAgeBand}
          locale={locale}
          error={state.fieldErrors.ageBand}
        />
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-sm font-medium text-foreground">
          {t("pointsFlagsLegend")}
        </legend>
        {(POINT_FLAGS as readonly FlagOption[]).map((flag) => (
          <label
            key={flag.value}
            className="flex items-start gap-2.5 rounded-lg border border-border p-3 text-start"
          >
            <input
              type="checkbox"
              name="flags"
              value={flag.value}
              checked={flags.includes(flag.value as PointFlag)}
              onChange={(event) =>
                toggleFlag(flag.value as PointFlag, event.target.checked)
              }
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-foreground">
                {pick(locale, flag.labelEn, flag.labelAr)}
              </span>
              {flag.hintEn && flag.hintAr && (
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {pick(locale, flag.hintEn, flag.hintAr)}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs font-semibold text-primary">
              +{flag.points}
            </span>
          </label>
        ))}
      </fieldset>

      {/* Running total. aria-live so a screen-reader user hears it change
          rather than having to hunt for it after every answer. */}
      <div
        aria-live="polite"
        className={`flex flex-col gap-2 rounded-xl border p-4 ${
          result.meetsThreshold
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-foreground">
            {t("pointsTotal")}
          </span>
          <span className="text-2xl font-semibold text-foreground">
            {result.total}
            <span className="text-sm text-muted-foreground">
              {" "}
              / {MIN_POINTS_REQUIRED}
            </span>
          </span>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {result.meetsThreshold
            ? t("pointsPassNote")
            : t("pointsFailNote", { needed: MIN_POINTS_REQUIRED })}
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/applications/${applicationId}/wizard?step=${STEP_IDENTITY}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("back")}
        </Link>
        <SubmitButton blocked={!result.meetsThreshold} />
      </div>
    </form>
  );
}
