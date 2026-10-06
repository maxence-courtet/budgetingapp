import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// Next's request URL rewrites any 127.0.0.1 / [::1] it finds to "localhost", including inside query strings,
// which breaks OAuth for assistants whose redirect_uri is http://127.0.0.1:<port>/... The standard Request
// getter still returns the URL as received, so hand Better Auth that.
const rawUrl = Object.getOwnPropertyDescriptor(Request.prototype, "url")!.get!;

function asReceived(request: Request) {
  const url = rawUrl.call(request) as string;
  return url === request.url ? request : new Request(url, { method: request.method, headers: request.headers });
}

export const GET = (req: Request) => toNextJsHandler(getAuth()).GET(asReceived(req));
export const POST = (req: Request) => toNextJsHandler(getAuth()).POST(req);
