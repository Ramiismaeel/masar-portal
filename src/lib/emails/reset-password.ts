import { emailLayout, emailButton } from "./layout";

export function resetPasswordEmail({
  name,
  url,
}: {
  name: string;
  url: string;
}) {
  return {
    subject: "Reset your Masar Portal password",
    html: emailLayout(`
      <h2 style="color: #0d4d35;">Reset your password</h2>

      <p>Hello ${name},</p>

      <p>We received a request to reset the password for your Masar Portal account.</p>

      ${emailButton(url, "Set a new password")}

      <p style="font-size: 14px; color: #555;">
        If the button does not work, copy this link into your browser:
      </p>
      <p style="font-size: 13px; word-break: break-all; color: #555;">${url}</p>

      <p style="font-size: 14px; color: #555;">
        This link expires in 7 days.
      </p>

      <p style="font-size: 14px; color: #555;">
        <strong>If you did not request this, you can ignore this email — your password has
        not been changed.</strong>
      </p>
    `),
  };
}
