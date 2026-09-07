"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { ShieldCheck, ShieldAlert, Copy, Check } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Two-factor enrolment, on the account page rather than under /admin on
 * purpose: admin/layout.tsx redirects an admin without 2FA *here*, so this
 * page must sit outside the gate it exists to satisfy. Putting it inside
 * /admin would mean the only route that can clear the requirement is itself
 * blocked by the requirement.
 *
 * Three phases, because enrolment genuinely is three steps and pretending
 * otherwise loses the backup codes:
 *
 *   idle → showing QR + codes (enable) → verified (verifyTotp)
 *
 * `twoFactorEnabled` does NOT become true at step 2 — the plugin is left on
 * its default `skipVerificationOnEnable: false`, so it flips only after a real
 * code is accepted. That is deliberate: it makes it impossible to lock
 * yourself out by pressing "enable" and never scanning anything.
 */
type Phase = "idle" | "pending" | "enrolling" | "done";

/** Which destructive action is awaiting confirmation, if any. */
type Confirming = null | "reenrol" | "disable";

export function TwoFactorControl({
  enabled,
  pendingSetup,
  hasPassword,
}: {
  enabled: boolean;
  /**
   * A `two_factors` row exists but was never verified — setup was started and
   * abandoned (a reload, a closed tab). Without this the account page showed
   * the "start setup" button again, and pressing it minted a *new* secret,
   * orphaning whatever had already been scanned into the authenticator app.
   */
  pendingSetup: boolean;
  /**
   * Whether this account has a credential (password) row at all. A Google-only
   * account has none, and better-auth's `allowPasswordless: true` lets it
   * enrol without one — so asking it for a password would be asking for
   * something that does not exist. See src/lib/auth.ts.
   */
  hasPassword: boolean;
}) {
  const t = useTranslations("Account.TwoFactor");
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>(
    enabled ? "done" : pendingSetup ? "pending" : "idle",
  );
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleEnable(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { data, error } = await authClient.twoFactor.enable({
        // Sent even when empty for a passwordless account: the server decides
        // whether it is required (shouldRequirePassword), never the client.
        password,
        // The plugin also supports an emailed-OTP second factor, which this
        // app deliberately does not configure (`otpOptions.sendOTP` is unset,
        // and email is already the recovery channel — a second factor
        // delivered to the same mailbox that can reset the password is not
        // really a second factor). Asking for "totp" explicitly keeps that
        // choice visible here rather than implied by config elsewhere.
        method: "totp",
      });

      if (error || !data) {
        setError(t("errorEnable"));
        return;
      }

      // Narrowing the response union rather than asserting: the server picks
      // the method, so treating the answer as authoritative is the honest
      // shape even though "totp" is the only one we asked for.
      if (data.method !== "totp") {
        setError(t("errorGeneric"));
        return;
      }

      setTotpUri(data.totpURI);
      setBackupCodes(data.backupCodes ?? []);
      setPassword("");
      setPhase("enrolling");
    } catch (cause) {
      console.error("[two-factor] enable failed", cause);
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code });

      if (error) {
        setError(t("errorCode"));
        return;
      }

      setPhase("done");
      setTotpUri(null);
      setCode("");
      // The gate in admin/layout.tsx reads twoFactorEnabled off the session,
      // so the server needs to re-render before that redirect stops firing.
      router.refresh();
    } catch (cause) {
      console.error("[two-factor] verify failed", cause);
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Replaces the backup codes on an already-enrolled account, leaving the TOTP
   * secret alone — so the authenticator app keeps working and only the paper
   * codes rotate. Verified against the endpoint's source: it updates the
   * `backupCodes` column only.
   *
   * This exists because the "enabled" state used to be a dead end: no way to
   * rotate codes, so anyone who lost or used up their codes had no route back
   * inside the app at all. On an admin account, which cannot self-serve past
   * the /admin gate, that meant editing the database by hand.
   */
  async function handleRegenerate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({
        password,
      });

      if (error || !data) {
        setError(t("errorRegenerate"));
        return;
      }

      setBackupCodes(data.backupCodes);
      setPassword("");
    } catch (cause) {
      console.error("[two-factor] regenerate failed", cause);
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Re-displays the QR for the secret ALREADY stored — it does not mint a new
   * one (verified in the endpoint's source: it decrypts `twoFactor.secret` and
   * rebuilds the URI). That is the whole point: someone resuming an abandoned
   * setup, or scanning onto a second device, must not have the secret changed
   * underneath the entry they already have.
   */
  async function handleShowQr(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { data, error } = await authClient.twoFactor.getTotpUri({
        password,
      });

      if (error || !data) {
        setError(t("errorGeneric"));
        return;
      }

      setTotpUri(data.totpURI);
      setPassword("");
      setPhase("enrolling");
    } catch (cause) {
      console.error("[two-factor] get-totp-uri failed", cause);
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { error } = await authClient.twoFactor.disable({ password });

      if (error) {
        setError(t("errorDisable"));
        return;
      }

      setPhase("idle");
      setConfirming(null);
      setPassword("");
      setBackupCodes([]);
      setTotpUri(null);
      // An admin who turns this off is immediately outside the /admin gate;
      // the server needs to re-render for that to take effect anywhere else
      // on the page.
      router.refresh();
    } catch (cause) {
      console.error("[two-factor] disable failed", cause);
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the codes are on screen either way.
    }
  }

  // Shared by enrolment and by regeneration — both hand out a fresh set that
  // is shown exactly once, so they must present it identically. Two copies of
  // this markup is how one of them quietly loses the "save these now" warning.
  const codesBox = backupCodes.length > 0 && (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
        {t("backupTitle")}
      </p>
      <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
        {t("backupHelp")}
      </p>
      <ul
        dir="ltr"
        className="grid grid-cols-2 gap-1 font-mono text-xs text-amber-900 dark:text-amber-200"
      >
        {backupCodes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={copyCodes}
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {copied ? t("copied") : t("copyCodes")}
      </Button>
    </div>
  );

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        {phase === "done" ? (
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <ShieldAlert
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-card-foreground">
            {t("title")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {phase === "done" ? t("statusOn") : t("statusOff")}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {phase === "idle" && (
        <form onSubmit={handleEnable} className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{t("intro")}</p>

          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="tf-password">{t("confirmPassword")}</Label>
              <PasswordInput
                id="tf-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={busy}
                showLabel={t("showPassword")}
                hideLabel={t("hidePassword")}
              />
            </div>
          )}

          <Button type="submit" loading={busy} className="self-start">
            {t("enable")}
          </Button>
        </form>
      )}

      {/* Setup was started and never finished. The stored secret is still the
          one that was scanned, so the fastest way out is simply to enter a
          code — no new QR, no new secret, nothing orphaned. Re-displaying the
          QR is offered second, for the case where nothing was scanned. */}
      {phase === "pending" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{t("pendingIntro")}</p>

          <form onSubmit={handleVerify} className="flex flex-col gap-2">
            <Label htmlFor="tf-pending-code">{t("enterCode")}</Label>
            <Input
              id="tf-pending-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              dir="ltr"
              required
              disabled={busy}
              className="max-w-40 font-mono tracking-widest"
            />
            <Button
              type="submit"
              loading={busy}
              disabled={code.length !== 6}
              className="self-start"
            >
              {t("verify")}
            </Button>
          </form>

          <form onSubmit={handleShowQr} className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">{t("showQrIntro")}</p>
            {hasPassword && (
              <PasswordInput
                id="tf-pending-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={busy}
                showLabel={t("showPassword")}
                hideLabel={t("hidePassword")}
                className="max-w-xs"
              />
            )}
            <Button
              type="submit"
              variant="outline"
              size="sm"
              loading={busy}
              className="self-start"
            >
              {t("showQr")}
            </Button>
          </form>
        </div>
      )}

      {phase === "enrolling" && totpUri && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">{t("scanIntro")}</p>

          {/* White plate is not decoration: QR readers need light quiet zone
              around dark modules, and in dark mode the card background would
              otherwise invert the contrast and make this unscannable. */}
          <div className="self-start rounded-lg bg-white p-3">
            <QRCode value={totpUri} size={160} />
          </div>

          {codesBox}

          <form onSubmit={handleVerify} className="flex flex-col gap-2">
            <Label htmlFor="tf-code">{t("enterCode")}</Label>
            <Input
              id="tf-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              dir="ltr"
              required
              disabled={busy}
              className="max-w-40 font-mono tracking-widest"
            />
            <Button
              type="submit"
              loading={busy}
              disabled={code.length !== 6}
              className="self-start"
            >
              {t("verify")}
            </Button>
          </form>
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{t("doneHelp")}</p>

          {codesBox || (
            <form onSubmit={handleRegenerate} className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                {t("regenerateIntro")}
              </p>

              {hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="tf-regen-password">
                    {t("confirmPassword")}
                  </Label>
                  <PasswordInput
                    id="tf-regen-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={busy}
                    showLabel={t("showPassword")}
                    hideLabel={t("hidePassword")}
                  />
                </div>
              )}

              <Button
                type="submit"
                variant="outline"
                loading={busy}
                className="self-start"
              >
                {t("regenerate")}
              </Button>
            </form>
          )}

          {/* Both actions below are destructive in ways that are not obvious
              from their labels, so neither fires on a single click.

              Re-enrolling is the sharper one: better-auth's `enable` handler
              does `adapter.update` on the existing row, replacing the secret
              and backup codes IMMEDIATELY while `twoFactorEnabled` stays true.
              Press it and walk away without scanning, and the account demands
              a code from a secret nobody has — locked out. Hence the warning
              and the confirm step. */}
          <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
            {confirming === null && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfirming("reenrol");
                    setError(null);
                  }}
                >
                  {t("reenrol")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfirming("disable");
                    setError(null);
                  }}
                >
                  {t("disable")}
                </Button>
              </div>
            )}

            {confirming !== null && (
              <form
                onSubmit={confirming === "disable" ? handleDisable : handleEnable}
                className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
              >
                <p className="text-xs text-destructive">
                  {confirming === "disable"
                    ? t("disableWarning")
                    : t("reenrolWarning")}
                </p>

                {hasPassword && (
                  <PasswordInput
                    id="tf-danger-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={busy}
                    showLabel={t("showPassword")}
                    hideLabel={t("hidePassword")}
                    className="max-w-xs"
                  />
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    loading={busy}
                  >
                    {confirming === "disable"
                      ? t("disableConfirm")
                      : t("reenrolConfirm")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setConfirming(null);
                      setPassword("");
                      setError(null);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
