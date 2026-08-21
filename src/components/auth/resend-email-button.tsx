"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function ResendEmailButton({ email }: { email: string }) {
  const [isResending, setIsResending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/verify-email",
      });

      if (error) {
        setError(
          error.message ?? "Could not send the email. Please try again.",
        );
        return;
      }

      setSent(true);
    } catch (err) {
      console.error(err);
      setError("Could not send the email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  if (sent) {
    return (
      <span className="text-sm font-medium">
        Email sent — check your inbox.
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleResend}
        disabled={isResending}
      >
        {isResending ? "Sending…" : "Resend email"}
      </Button>

      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
