import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "@better-auth/api-key/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // oauthProviderClient carries the signed OAuth request through the login and consent pages when an
  // AI assistant sends the user here to sign in.
  // The login form shows the two-factor step itself (no redirect to another page).
  plugins: [apiKeyClient(), oauthProviderClient(), twoFactorClient({ onTwoFactorRedirect: () => undefined })],
});
