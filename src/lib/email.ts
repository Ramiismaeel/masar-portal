import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    html,
  });

  if (error) {
    // Never throw: a failed email must not break signup, password reset,
    // or an admin's review action. Log it and report failure to the caller.
    console.error("[email] send failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
