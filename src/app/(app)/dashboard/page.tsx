import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // The layout already guarantees a session; this narrows the type for TypeScript.
  if (!session) return null;

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>

      {applications.length === 0 ? (
        <p className="text-muted-foreground">
          You have not started an application yet.
        </p>
      ) : (
        <p className="text-muted-foreground">
          You have {applications.length} application(s).
        </p>
      )}
    </div>
  );
}
