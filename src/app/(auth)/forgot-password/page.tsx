"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.includes("@")) return;

    setIsSubmitting(true);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
    } catch (err) {
      // Logged for us, never shown to the user — see note below.
      console.error(err);
    } finally {
      setSent(true);
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Reset your password</CardTitle>
      </CardHeader>

      <CardContent>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm">
              If an account exists for{" "}
              <span className="font-medium">{email}</span>, we have sent a reset
              link. Please check your inbox and your spam folder.
            </p>

            <p className="text-sm text-muted-foreground">
              The link expires in 1 hour.
            </p>

            <Link
              href="/login"
              className="inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the email address you signed up with and we will send you a
              link to set a new password.
            </p>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Back to login
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
