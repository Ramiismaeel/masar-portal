import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { findCategory } from "@/lib/categories";
import { APPLICATION_STATUS_META } from "@/lib/application-status";
import { isWizardComplete, totalSteps } from "@/lib/wizard";
import type { UserApplication } from "@/lib/applications";
import { Button } from "@/components/ui/button";

// Fixed locale, not the visitor's: this renders on the server, and letting the
// output depend on the server's locale is how you get hydration mismatches.
// Phase 7 will swap this for the user's chosen locale explicitly.
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function ApplicationCard({
  application,
  highlighted = false,
}: {
  application: UserApplication;
  highlighted?: boolean;
}) {
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
              {category.labelEn}
            </span>
            <span className="text-xs text-muted-foreground">
              Started {dateFormatter.format(application.createdAt)}
            </span>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
        >
          {status.labelEn}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        {isDraft && !complete
          ? `Questions: step ${Math.min(application.currentStep + 1, total)} of ${total}`
          : `${application._count.documents} document${
              application._count.documents === 1 ? "" : "s"
            } uploaded`}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={isDraft && !complete ? "default" : "outline"}
          nativeButton={false}
          render={<Link href={href} />}
        >
          {isDraft && !complete ? "Continue" : "View checklist"}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
