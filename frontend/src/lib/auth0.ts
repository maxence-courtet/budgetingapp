import { Auth0Client } from '@auth0/nextjs-auth0/server';

let _auth0: Auth0Client | null = null;

export function getAuth0() {
  if (!_auth0) {
    _auth0 = new Auth0Client({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      secret: process.env.AUTH0_SECRET,
      appBaseUrl: process.env.APP_BASE_URL,
      authorizationParameters: {
        audience: process.env.AUTH0_AUDIENCE,
      },
    });
  }
  return _auth0;
}

// For backwards compat with existing imports
export const auth0 = new Proxy({} as Auth0Client, {
  get(_, prop) {
    return (getAuth0() as any)[prop];
  },
});
