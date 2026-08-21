import { prisma } from "@/lib/prisma";

/**
 * Every application belonging to one user, newest first.
 *
 * `userId` comes from the session at the call site and is never optional — this
 * function has no "fetch all applications" mode, so there is no version of it
 * that can leak another user's data.
 *
 * `select` is explicit rather than returning whole rows: the dashboard does not
 * need passportNumber, and data you do not fetch cannot accidentally be
 * serialised into the HTML sent to the browser.
 */
export async function getUserApplications(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      status: true,
      currentStep: true,
      submittedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { documents: true } },
    },
  });
}

export type UserApplication = Awaited<
  ReturnType<typeof getUserApplications>
>[number];
