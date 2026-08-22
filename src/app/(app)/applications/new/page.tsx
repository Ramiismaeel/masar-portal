import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findCategory } from "@/lib/categories";
import { pick } from "@/i18n/pick";
import type { Locale } from "@/i18n/locale";
import { StartApplicationForm } from "@/components/start-application-form";
import type { VisaCategory } from "@/generated/prisma/client";

/**
 * Confirmation screen for starting an application.
 *
 * Why a screen at all, instead of the home card calling the action directly:
 * creating a row is a mutation, and mutations must never happen on a GET.
 * A link that creates data would fire on a browser prefetch, a bookmark, or a
 * chat-app link preview. So the link lands here, and a POST does the writing.
 */
export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: raw } = await searchParams;
  const category = findCategory(raw);

  if (!category) notFound();

  // The (app) layout already guarantees a session; we read it again for
  // emailVerified and to scope the query below.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  // One application per category: if it exists, resume it instead of offering
  // to create a second one. Scoped by session.user.id — never by a client id.
  const existing = await prisma.application.findUnique({
    where: {
      userId_category: {
        userId: session.user.id,
        category: category.value as VisaCategory,
      },
    },
    select: { id: true },
  });

  if (existing) redirect(`/applications/${existing.id}/wizard`);

  const Icon = category.icon;
  const t = await getTranslations("NewApplication");
  const common = await getTranslations("Common");
  const locale = (await getLocale()) as Locale;

  return (
    <div className="mx-auto w-full max-w-xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {common("backToDashboard")}
      </Link>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>

        <h1 className="mt-4 text-2xl font-semibold text-card-foreground">
          {pick(locale, category.labelEn, category.labelAr)}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {pick(locale, category.blurbEn, category.blurbAr)}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>

        <div className="mt-6">
          <StartApplicationForm
            category={category.value}
            emailVerified={Boolean(session.user.emailVerified)}
          />
        </div>
      </div>
    </div>
  );
}
