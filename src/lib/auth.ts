import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { verificationEmail } from "./emails/verification";
import { resetPasswordEmail } from "./emails/reset-password";
import { deleteAccountEmail } from "./emails/delete-account";
import { purgeUserStorage } from "./account-deletion";
import { recordAudit } from "./audit";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [process.env.BETTER_AUTH_URL!],

  // Default account-linking behaviour (no `account.accountLinking` override
  // needed — verified in shipped code, not docs): a Google sign-in auto-links
  // to an existing user by email ONLY when that user's own emailVerified is
  // already true. An unverified local account blocks the link and the
  // callback redirects to errorCallbackURL with ?error=account_not_linked —
  // see GoogleSignInButton and LoginForm's handling of it. Google itself
  // always reports emailVerified: true, so the provider side is never the
  // blocker.
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  emailAndPassword: {
    enabled: true,
    // Closes the signup enumeration leak. With this false, better-auth returns a
    // synthetic user + token: null for duplicate signups, hashes a throwaway
    // password to equalise timing, and never 422s. Side effect: signup no longer
    // issues a session — that's why the signup page changes below.
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      const { subject, html } = resetPasswordEmail({
        name: user.name,
        url,
      });

      await sendEmail({ to: user.email, subject, html });
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false, // clients may NEVER set this
      },
      locale: {
        type: "string",
        input: false,
        defaultValue: "en",
      },
    },

    // GDPR Art. 17 self-service erasure (Phase 11). The Datenschutz has
    // promised this in writing since Phase 8 ("we do not yet offer... this is
    // a planned feature") — that text gets updated alongside this.
    deleteUser: {
      enabled: true,

      // Email confirmation rather than a password prompt, deliberately.
      // Better Auth offers three paths (read from its source, not docs):
      // a password check, a fresh-session check, or this emailed token.
      //   - A password check would hard-fail every Google-only account —
      //     they have no credential row to verify against.
      //   - The fresh-session fallback (default: any session under a day old)
      //     would let anyone holding an unlocked, still-signed-in phone
      //     permanently destroy someone's visa application. This app's own
      //     threat model already names shared/internet-café devices.
      // The emailed token is the only option that covers both auth methods
      // and proves mailbox control before anything is destroyed.
      sendDeleteAccountVerification: async ({ user, url }) => {
        const { subject, html } = deleteAccountEmail({ name: user.name, url });
        await sendEmail({ to: user.email, subject, html });
      },

      // 1 hour, matching password reset — short on purpose. This is the most
      // destructive action in the app; a link that stays live for a day is a
      // day-long window on a forwarded or compromised mailbox. (Contrast the
      // 7-day verification link, where the risk of expiry is real and the
      // downside of a stale click is nil.)
      deleteTokenExpiresIn: 60 * 60,

      // Runs before the row is deleted on BOTH deletion paths — verified in
      // better-auth's source. Must be before: the cascade takes the
      // storageKeys with it. See purgeUserStorage.
      beforeDelete: async (user) => {
        await purgeUserStorage(user.id);
      },

      // afterDelete, not before: this records that erasure COMPLETED, so it
      // must not be written for an attempt that then failed. The row
      // deliberately outlives the user — see the AuditLog model comment for
      // why that is both intentional and defensible.
      afterDelete: async (user) => {
        await recordAudit({
          action: "ACCOUNT_DELETED",
          actorUserId: user.id,
          subjectUserId: user.id,
          targetType: "user",
          targetId: user.id,
          metadata: { self_service: true },
        });
      },
    },
  },

  // Second factor for STAFF. The threat this answers is specific: one leaked
  // admin password exposes every passport, medical report and criminal-record
  // extract in the portal at once. Applicants are not required to use it —
  // enforcement lives in admin/layout.tsx and requireAdminSession(), not here.
  plugins: [
    twoFactor({
      // Shown as the account name in Google Authenticator / Aegis.
      issuer: "Masar Portal",

      // Read from better-auth's source (utils/password.mjs), not the docs:
      //   shouldRequirePassword = !allowPasswordless
      //       ? true
      //       : Boolean(credentialAccount?.password)
      // So this does NOT weaken anyone who has a password — they are still
      // asked for it. What it does is stop a Google-only account being unable
      // to enrol at all, which with admin enforcement on would mean locked out
      // of /admin with no way back in. Exactly the trap deleteUser above
      // already documents for password checks on Google-only accounts, and
      // relevant here because every non-admin user in this database today is
      // Google-only while `role` is granted by hand in Postgres.
      allowPasswordless: true,

      // Left at the default (false) deliberately: `twoFactorEnabled` only
      // flips true after the first code is verified. Enabling optimistically
      // would let someone lock themselves out by scanning nothing.
      // skipVerificationOnEnable: false,

      backupCodeOptions: {
        // Already the plugin's default — `twoFactor()` builds
        // `{ storeBackupCodes: "encrypted", ...options?.backupCodeOptions }`,
        // so this changes nothing today. It is pinned explicitly because a
        // backup code bypasses TOTP entirely: if a future version ever flipped
        // that default, the bypass credential for every admin would silently
        // start living in the database in clear text, and nothing in this app
        // would fail loudly enough to notice.
        //
        // (An earlier comment here claimed this option *fixed* plaintext
        // storage. It did not — see docs/roadmap.md, "RETRACTED".)
        storeBackupCodes: "encrypted",
      },
    }),
  ],

  emailVerification: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html } = verificationEmail({
        name: user.name,
        url,
      });

      await sendEmail({ to: user.email, subject, html });
    },
  },
});
