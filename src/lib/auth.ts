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
