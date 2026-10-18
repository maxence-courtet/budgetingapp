import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "@better-auth/api-key/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";

export const authClient = createAuthClient({
  // oauthProviderClient carries the signed OAuth request through the login and consent pages when an
  // AI assistant sends the user here to sign in.
  plugins: [apiKeyClient(), oauthProviderClient()],
});
