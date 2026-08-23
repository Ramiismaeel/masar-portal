import { emailLayout, emailButton } from "./layout";

/**
 * Confirms an account-deletion request. Deliberately spells out that the
 * link must be opened in the same browser the request came from — Better
 * Auth's delete-user callback reads the session before it will accept the
 * token (verified in its source), so a link opened on a different device
 * fails. It fails *safely*: the session check happens before the token is
 * consumed, so the link still works after signing in again.
 */
export function deleteAccountEmail({
  name,
  url,
}: {
  name: string;
  url: string;
}) {
  return {
    subject: "Confirm deleting your Masar Portal account",
    html: emailLayout(`
      <h2 style="color: #0054d7;">Confirm account deletion</h2>

      <p>Hello ${name},</p>

      <p>
        We received a request to permanently delete your Masar Portal account.
        This removes your applications and every document you uploaded, including
        your passport and any other files. <strong>It cannot be undone.</strong>
      </p>

      ${emailButton(url, "Delete my account permanently")}

      <p style="font-size: 14px; color: #555;">
        If the button does not work, copy this link into your browser:
      </p>
      <p style="font-size: 13px; word-break: break-all; color: #555;">${url}</p>

      <p style="font-size: 14px; color: #555;">
        Please open this link in the same browser you requested the deletion from,
        while still signed in. This link expires in 1 hour.
      </p>

      <p style="font-size: 14px; color: #555;">
        <strong>If you did not request this, you can ignore this email — your
        account has not been changed.</strong>
      </p>
    `),
  };
}
