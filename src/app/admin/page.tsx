import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { findCategory } from "@/lib/categories";
import { APPLICATION_STATUS_META } from "@/lib/application-status";
import type { ApplicationStatus } from "@/generated/prisma/client";

const TABS: { value: ApplicationStatus; label: string }[] = [
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "NEEDS_REVISION", label: "Needs revision" },
  { value: "REJECTED", label: "Rejected" },
  { value: "APPROVED", label: "Approved" },
];

function isTabStatus(value: string | undefined): value is ApplicationStatus {
  return TABS.some((tab) => tab.value === value);
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status: ApplicationStatus = isTabStatus(rawStatus)
    ? rawStatus
    : "PENDING_REVIEW";

  // DRAFT is excluded on purpose — nothing here is an admin's to act on
  // until an applicant has submitted it.
  const applications = await prisma.application.findMany({
    where: { status },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      category: true,
      status: true,
      submittedAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Applications</h1>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin?status=${tab.value}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              status === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {applications.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Nothing here right now.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {applications.map((application) => {
            const category = findCategory(application.category);
            const meta = APPLICATION_STATUS_META[application.status];

            return (
              <li key={application.id}>
                <Link
                  href={`/admin/applications/${application.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
                >
                  <div className="flex flex-col text-start">
                    <span className="font-medium text-card-foreground">
                      {application.user.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {application.user.email} ·{" "}
                      {category?.labelEn ?? application.category}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
                    >
                      {meta.labelEn}
                    </span>
                    {application.submittedAt && (
                      <span className="text-xs text-muted-foreground">
                        {dateFormatter.format(application.submittedAt)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
