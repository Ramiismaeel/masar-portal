"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * The second step of signing in. Reached only after a sign-in came back with
 * `twoFactorRedirect` instead of a session — at that point better-auth holds a
 * short-lived challenge cookie (10 minutes) and there is NO usable session yet,
 * which is why this page lives in the (auth) group with no session check.
 *
 * ONE input accepts BOTH credentials and the endpoint is chosen from the SHAPE
 * of what was typed — never from which mode the UI happens to be in. Two bugs,
 * found by real use, produced that rule:
 *
 *  1. The first version filtered input per mode: authenticator mode ran
 *     `replace(/\D/g, "")` with `maxLength={6}`, so typing the backup code
 *     `9UJaj-4xRLO` silently became `94`. Sanitising input is destructive
 *     whenever the server does an exact string match, which `verifyBackupCode`
 *     does.
 *  2. Removing the mode switch entirely then made people think the backup
 *     option was gone — the first thing someone does when their phone is lost
 *     is *look for the button*. Discoverability is not optional on a recovery
 *     path.
 *
 * So the switch is back, but it is now PURELY COSMETIC: it changes the label,
 * placeholder and emphasis, and nothing else. Being in the "wrong" mode cannot
 * mangle, truncate or misroute anything.
 */

/** Authenticator codes are exactly six digits; backup codes never are. */
const TOTP_PATTERN = /^\d{6}$/;

/**
 * Repairs copy-paste damage — and note the difference from the input filtering
 * that this component used to do and that broke it: nothing valid is removed
 * here. Every character replaced below is one a real code CANNOT contain, so
 * this can only turn a failing paste into a passing one.
 *
 * The case that prompted it: backup codes look like `9UJaj-4xRLO`, and saving
 * them in Word or Google Docs silently autocorrects the plain hyphen-minus into
 * an en-dash (`–`). On screen the two are nearly identical; to
 * `codes.includes(code)`, which is an exact string comparison, they are simply
 * different codes. Same story for a zero-width character or a non-breaking
 * space picked up from a web page or a PDF.
 *
 * Deliberately NOT done here: changing case (codes are mixed-case and
 * case-sensitive) or stripping anything alphanumeric.
 */
function repairPastedCode(value: string): string {
  const cleaned = value
    .replace(/[‐-―−﹘﹣－]/g, "-") // dash lookalikes
    .replace(/[​-‍﻿]/g, "") // zero-width junk
    .replace(/ /g, " ") // non-breaking space → normal, so trim() catches it
    .trim();

  // Six digits is an authenticator code — hand it back untouched.
  if (TOTP_PATTERN.test(cleaned)) return cleaned;

  // Otherwise pull out the FIRST backup-code-shaped token. The account page's
  // "Copy codes" button copies all ten at once (right for saving them), and a
  // single-line <input> strips newlines on paste — so pasting that clipboard
  // here yields ten codes run together, matching nothing. Any unused code is
  // as good as any other, so taking the first is both safe and what the person
  // meant.
  //
  // A correctly typed single code matches this pattern exactly and comes back
  // unchanged; anything genuinely malformed falls through to be rejected by
  // the server rather than silently reshaped into something else.
  const match = cleaned.match(/[A-Za-z0-9]{5}-[A-Za-z0-9]{5}/);
  return match ? match[0] : cleaned;
}

export function TwoFactorForm() {
  const t = useTranslations("Auth.TwoFactor");
  const router = useRouter();

  const [code, setCode] = useState("");
  // Presentation only — see the note above. Never consulted when deciding
  // which endpoint to call.
  const [useBackup, setUseBackup] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const entered = repairPastedCode(code);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { error } = TOTP_PATTERN.test(entered)
        ? await authClient.twoFactor.verifyTotp({ code: entered, trustDevice })
        : await authClient.twoFactor.verifyBackupCode({
            code: entered,
            trustDevice,
          });

      if (error) {
        // The lockout IS surfaced, after originally being folded into the
        // generic message "so as not to tell an attacker anything". That was
        // the wrong call and it cost real time: ten failed backup-code
        // attempts silently locked the account for 15 minutes, after which
        // even correct authenticator codes were rejected — with the UI still
        // saying only "that code was not accepted", so the obvious reading was
        // that 2FA itself was broken.
        //
        // The secrecy bought nothing either: someone brute-forcing codes
        // already knows their attempts are failing, so "temporarily locked"
        // tells them almost nothing. A locked-out legitimate user, on the
        // other hand, cannot even guess that waiting is the answer. The plugin
        // throws TOO_MANY_REQUESTS (429) for this — see
        // assertTwoFactorNotLocked in better-auth's verify-two-factor.mjs.
        setError(error.status === 429 ? t("errorLocked") : t("errorCode"));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      console.error("[two-factor] sign-in verification failed", cause);
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tf-signin-code">
                {useBackup ? t("backupLabel") : t("codeLabel")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {useBackup ? t("backupHelp") : t("codeHelp")}
              </p>
              <Input
                id="tf-signin-code"
                value={code}
                // No filtering and no maxLength, on purpose. Backup codes are
                // mixed-case and contain a hyphen (XXXXX-XXXXX), and the server
                // compares them with an exact string match — so stripping
                // characters, truncating, or "helpfully" upper-casing would all
                // turn a valid code into an invalid one. Whitespace is trimmed
                // at submit, which is the only safe normalisation here.
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                // The old placeholder was always "000000", which told everyone
                // the field takes digits only — louder than any help text
                // underneath it, and flatly wrong for a backup code.
                placeholder={useBackup ? "xxxxx-xxxxx" : "000000"}
                dir="ltr"
                required
                autoFocus
                disabled={busy}
                className="font-mono tracking-widest"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                disabled={busy}
                className="size-4 accent-primary"
              />
              {t("trustDevice")}
            </label>

            <Button
              type="submit"
              className="w-full"
              loading={busy}
              disabled={entered.length === 0}
            >
              {t("submit")}
            </Button>
          </form>

          {/* A real button, not a footnote. Someone reaching for this has lost
              their phone and is already anxious; making them read prose to
              discover the recovery path is the wrong time to be subtle.
              Switching only changes wording — whatever is typed still routes by
              shape — so clicking it can never make things worse. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            disabled={busy}
            onClick={() => {
              setUseBackup((v) => !v);
              setCode("");
              setError(null);
            }}
          >
            {useBackup ? t("useAuthenticator") : t("useBackup")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
