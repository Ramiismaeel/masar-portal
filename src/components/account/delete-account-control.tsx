"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MailCheck, TriangleAlert } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/**
 * Three states: idle → confirming → sent. Nothing is destroyed by this
 * component; it only asks Better Auth to email a confirmation link. The
 * actual deletion happens when that link is opened (see auth.ts's
 * deleteUser config for why it's done that way).
 */
export function DeleteAccountControl() {
  const t = useTranslations("Account");
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestDelete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await authClient.deleteUser({
        callbackURL: "/account-deleted",
      });

      if (error) {
        setError(error.message ?? t("deleteError"));
        return;
      }

      setSent(true);
    } catch (err) {
      console.error(err);
      setError(t("deleteError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
        <MailCheck
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            {t("deleteSentTitle")}
          </p>
          <p className="text-sm text-muted-foreground">{t("deleteSentBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert
          className="mt-0.5 size-5 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            {t("deleteTitle")}
          </p>
          <p className="text-sm text-muted-foreground">{t("deleteBody")}</p>
        </div>
      </div>

      {confirming ? (
        <div className="flex flex-col gap-3 border-t border-destructive/20 pt-3">
          <p className="text-sm font-medium text-destructive">
            {t("deleteConfirmQuestion")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              loading={isSubmitting}
              onClick={handleRequestDelete}
            >
              {t("deleteConfirmYes")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setConfirming(false)}
            >
              {t("deleteCancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirming(true)}
          >
            {t("deleteAction")}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
