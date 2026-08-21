import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getUserApplications } from "@/lib/applications";
import { isCategoryValue, type CategoryValue } from "@/lib/categories";
import { ApplicationCard } from "@/components/application-card";
import { CategoryPicker } from "@/components/category-picker";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string }>;
}) {
  const { application: highlightedId } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });

  // The layout already guarantees a session; this narrows the type for TypeScript.
  if (!session) return null;

  const applications = await getUserApplications(session.user.id);

  // Narrowing the Prisma enum to our own union, so CategoryPicker cannot be
  // handed a value that CATEGORIES does not know about.
  const taken = applications
    .map((a) => a.category)
    .filter((c): c is CategoryValue => isCategoryValue(c));

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Your applications</h2>

        {applications.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            You have not started an application yet. Choose a category below to
            begin.
          </p>
        ) : (
          <ul className="space-y-3">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                // The wizard redirects here with ?application=<id>. Highlighting
                // that card answers "did my answers save?" without a toast.
                highlighted={application.id === highlightedId}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">
          {applications.length === 0
            ? "Choose a category"
            : "Start another application"}
        </h2>
        <CategoryPicker taken={taken} />
      </section>
    </div>
  );
}
