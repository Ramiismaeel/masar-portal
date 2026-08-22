import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { findCategory } from "@/lib/categories";
import { APPLICATION_STATUS_META } from "@/lib/application-status";
import { isWizardComplete, totalSteps } from "@/lib/wizard";
import type { UserApplication } from "@/lib/applications";
import { Button } from "@/components/ui/button";
import { pick } from "@/i18n/pick";
import type { Locale } from "@/i18n/locale";

export function ApplicationCard({
  application,
  locale,
  highlighted = false,
}: {
  application: UserApplication;
  locale: Locale;
  highlighted?: boolean;
}) {
  const t = useTranslations("ApplicationCard");
  const category = findCategory(application.category);
  if (!category) return null;

  const Icon = category.icon;
  const status = APPLICATION_STATUS_META[application.status];

  const isDraft = application.status === "DRAFT";
  const complete = isWizardComplete(category.value, application.currentStep);
  const total = totalSteps(category.value);

  const href = complete
    ? `/applications/${application.id}`
    : `/applications/${application.id}/wizard`;

  // Locale-dependent, so it can't be a module-level constant any more (Phase
  // 7 note this comment used to leave for itself) — Arabic gets Arabic month
  // names, but Western digits throughout the app stay consistent with the
  // Latin-only passport/phone fields elsewhere, so numberingSystem is pinned.
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "ar" ? "ar" : "en-GB",
    { day: "numeric", month: "short", year: "numeric", numberingSystem: "latn" },
  );

  return (
    <li
      className={`flex flex-col gap-4 rounded-xl border bg-card p-5 transition-colors ${
        highlighted ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col text-start">
            <span className="font-semibold text-card-foreground">
              {pick(locale, category.labelEn, category.labelAr)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("started", { date: dateFormatter.format(application.createdAt) })}
            </span>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
        >
          {pick(locale, status.labelEn, status.labelAr)}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        {isDraft && !complete
          ? t("questionsStep", {
              current: Math.min(application.currentStep + 1, total),
              total,
            })
          : t("documentsUploaded", { count: application._count.documents })}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={isDraft && !complete ? "default" : "outline"}
          nativeButton={false}
          render={<Link href={href} />}
        >
          {isDraft && !complete ? t("continue") : t("viewChecklist")}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
