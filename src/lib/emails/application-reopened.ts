import { emailLayout, emailButton } from "./layout";

/**
 * Sent when an admin sends an already-decided application back for review.
 *
 * This email exists because staying silent would be worse than the mistake
 * it usually corrects: the applicant has already had a decision email, so
 * without this they'd be acting on an outcome that is no longer true — most
 * seriously in the approved case, where someone might be making travel or
 * financial plans.
 *
 * The wording is deliberately neutral about *why*. A reopen is most often an
 * admin correcting their own misclick, and phrasing that as though the
 * applicant did something wrong would be both inaccurate and alarming.
 */
export function applicationReopenedEmail({
  name,
  wasApproved,
  reason,
}: {
  name: string;
  /** Retracting an approval is the case that actually needs an apology. */
  wasApproved: boolean;
  reason: string | null;
}) {
  const intro = wasApproved
    ? "Your application had been marked as approved, but we've put it back " +
      "under review while we take another look. Sorry for the confusion — " +
      "please hold off on acting on the earlier approval until we confirm."
    : "We've put your application back under review while we take another look.";

  return {
    subject: "Your Masar Portal application is back under review",
    html: emailLayout(`
      <h2 style="color: #0054d7;">Back under review</h2>

      <p>Hello ${name},</p>

      <p>${intro}</p>

      ${
        reason
          ? `<p style="border-left: 3px solid #0054d7; padding-left: 12px; color: #333;">
               <strong>Note from Masar:</strong><br />${reason}
             </p>`
          : ""
      }

      <p style="font-size: 14px; color: #555;">
        You don't need to do anything right now — we'll email you again once
        there's a decision. Your uploaded documents have not been changed.
      </p>

      ${emailButton(`${process.env.BETTER_AUTH_URL}/dashboard`, "View your application")}
    `),
  };
}
