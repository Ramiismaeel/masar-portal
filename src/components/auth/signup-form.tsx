"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SignupForm() {
  const t = useTranslations("Auth.Signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set once signUp.email() returns with no error. Never derived from the
  // response's `user`/`token` — with autoSignIn: false, a duplicate signup
  // returns a synthetic user + token: null indistinguishable from a real one.
  // The only thing distinguishing "created" from "duplicate" on our side is
  // that both must show the exact same panel.
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError(t("errorRequired"));
      return;
    }
    if (!email.includes("@")) {
      setError(t("errorEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("errorPasswordLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errorPasswordMatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: "/verify-email",
      });

      if (error) {
        setError(error.message ?? t("errorSignupFallback"));
        return;
      }

      // No session is issued here (autoSignIn: false) — stay on this page
      // and tell them to check their inbox rather than redirecting to a
      // dashboard that would just bounce them back to /login.
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(t("errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{t("checkInboxTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t("checkInboxBody", { email })}
            </p>
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              {t("goToLogin")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
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
              <Label htmlFor="name">{t("fullName")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ahmad Al-Sayed"
                autoComplete="name"
                required
                disabled={isSubmitting}
              />
            </div>

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
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordHint")}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link
              href="/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("logIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
