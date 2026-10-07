import { googleEnabled } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  // The marketing site's "Start free" links here with ?mode=signup.
  const { mode } = await searchParams;
  return <LoginForm googleEnabled={googleEnabled} initialMode={mode === "signup" ? "signUp" : "signIn"} />;
}
