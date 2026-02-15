import { Auth0Client } from '@auth0/nextjs-auth0/server';

let _auth0: Auth0Client | null = null;

// Use bracket notation to prevent Next.js from inlining env vars at build time.
// These must be read at runtime when Railway injects them into the container.
function env(key: string): string | undefined {
  return process.env[key];
}

export function getAuth0(): Auth0Client {
  if (!_auth0) {
    _auth0 = new Auth0Client({
      domain: env('AUTH0_DOMAIN'),
      clientId: env('AUTH0_CLIENT_ID'),
      clientSecret: env('AUTH0_CLIENT_SECRET'),
      secret: env('AUTH0_SECRET'),
      appBaseUrl: env('APP_BASE_URL'),
      authorizationParameters: {
        audience: env('AUTH0_AUDIENCE'),
      },
    });
  }
  return _auth0;
}
