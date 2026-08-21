import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { verificationEmail } from "./emails/verification";
import { resetPasswordEmail } from "./emails/reset-password";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [process.env.BETTER_AUTH_URL!],

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
  },

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
