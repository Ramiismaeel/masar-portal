import { prisma } from "./prisma";
import type { AuditAction, Prisma } from "../generated/prisma/client";

/**
 * Writes one accountability entry. See the AuditLog model in schema.prisma
 * for why these rows hold ids rather than relations.
 *
 * NEVER throws. An audit write failing must not roll back or block the thing
 * it was recording — refusing to approve an application because a log insert
 * timed out would be worse than the missing line. Failures are logged loudly
 * to the server console instead, which is where they'd be noticed.
 *
 * Relative imports: this is reachable from src/lib/auth.ts, which the
 * Better Auth / Prisma CLIs load through jiti — and jiti does not resolve the
 * `@/` alias (docs/roadmap.md "Prisma 7 gotchas").
 */
export async function recordAudit(entry: {
  action: AuditAction;
  actorUserId?: string | null;
  subjectUserId?: string | null;
  targetType: "document" | "application" | "user";
  targetId: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorUserId: entry.actorUserId ?? null,
        subjectUserId: entry.subjectUserId ?? null,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata ?? {},
      },
    });
  } catch (error) {
    console.error("recordAudit failed — entry lost", entry.action, entry.targetId, error);
  }
}
