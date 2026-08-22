"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

/**
 * Maps the `?error=` code a failed Google OAuth callback redirects back with
 * (src/lib/auth.ts has the full account-linking explanation). Codes are
 * lowercase snake_case — verified in better-auth's own source, unlike the
 * email-verification flow's uppercase codes. `account_not_linked` is the one
 * case worth a specific message; every other code is a generic failure.
 */
function socialErrorMessage(
  code: string,
  t: (key: "errorAccountNotLinked" | "errorSocialGeneric") => string,
): string {
  if (code === "account_not_linked") return t("errorAccountNotLinked");
  return t("errorSocialGeneric");
}

export function LoginForm({
  initialSocialError,
}: {
  initialSocialError?: string;
}) {
  const t = useTranslations("Auth.Login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    initialSocialError ? socialErrorMessage(initialSocialError, t) : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side checks before submitting
    if (!email || !password) {
      setError(t("errorRequired"));
      return;
    }

    if (!email.includes("@")) {
      setError(t("errorEmail"));
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        setError(t("errorInvalid"));
        setIsSubmitting(false);
        return; // ← stop here
      }
      setIsSubmitting(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(t("errorGeneric"));
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                dir="ltr"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("password")}</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("orContinueWith")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleSignInButton
            label={t("continueWithGoogle")}
            callbackURL="/dashboard"
            onError={() => setError(t("errorSocialGeneric"))}
          />

          <p className="mt-4 text-center text-sm">
            {t("noAccount")}{" "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              {t("signup")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
