/** The Hive app (sign in / sign up), set at build time. */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
export const SIGN_IN = `${APP_URL}/login`;
export const SIGN_UP = `${APP_URL}/login?mode=signup`;
