import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// The client plugin must mirror the server plugin (src/lib/auth.ts) or the
// two-factor endpoints simply are not on `authClient`.
//
// No `twoFactorPage` option is passed on purpose. That option makes the plugin
// perform its own `window.location.href` redirect when a sign-in needs a
// second factor — a full page load that throws away the form's state and sits
// outside this app's routing. LoginForm reads the `twoFactorRedirect` flag off
// the sign-in response and navigates itself instead, the same way it already
// handles `?error=account_not_linked` from the Google callback.
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});
