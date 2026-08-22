import { emailLayout, emailButton } from "./layout";

const DECISION_COPY = {
  APPROVED: {
    subject: "Your Masar Portal application has been approved",
    heading: "Application approved",
    intro: "Good news — your application has been approved.",
  },
  NEEDS_REVISION: {
    subject: "Action needed on your Masar Portal application",
    heading: "Changes requested",
    intro:
      "An admin has reviewed your application and needs a few changes " +
      "before it can move forward. Open your checklist to see exactly which " +
      "document needs attention.",
  },
  REJECTED: {
    subject: "An update on your Masar Portal application",
    heading: "Application rejected",
    intro:
      "An admin has reviewed your application and it was not approved. " +
      "Open your checklist for details on what didn't pass review.",
  },
} as const;

export function applicationDecisionEmail({
  name,
  decision,
}: {
  name: string;
  decision: keyof typeof DECISION_COPY;
}) {
  const copy = DECISION_COPY[decision];

  return {
    subject: copy.subject,
    html: emailLayout(`
      <h2 style="color: #0d4d35;">${copy.heading}</h2>

      <p>Hello ${name},</p>

      <p>${copy.intro}</p>

      ${emailButton(`${process.env.BETTER_AUTH_URL}/dashboard`, "View your application")}
    `),
  };
}
