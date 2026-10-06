// Local dev environment: embedded Postgres + auth-bypass proxy + backend + frontend.
// Usage: cd dev && npm install && npm start   (requires Node >= 20.9)
import EmbeddedPostgres from "embedded-postgres";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error(`Node >= 20.9 is required (found ${process.versions.node}).`);
  process.exit(1);
}
for (const pkg of ["backend", "frontend"]) {
  if (!existsSync(path.join(root, pkg, "node_modules"))) {
    console.error(`Missing ${pkg}/node_modules - run "npm install" in ${pkg}/ first.`);
    process.exit(1);
  }
}

const PG_PORT = 5433;
const SERVICE_TOKEN = "local-dev-service-token";
const DATABASE_URL = `postgresql://dev:dev@localhost:${PG_PORT}/budget_app`;
const dataDir = path.join(here, ".data");
const children = [];

function run(name, cmd, args, cwd, env = {}) {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  const prefix = `[${name}]`.padEnd(11);
  const forward = (stream, out) =>
    stream.on("data", (buf) => {
      for (const line of buf.toString().split("\n")) if (line.trim()) out.write(`${prefix}${line}\n`);
    });
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);
  children.push(child);
  return child;
}

function runToCompletion(name, cmd, args, cwd, env) {
  return new Promise((resolve, reject) => {
    run(name, cmd, args, cwd, env).on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${name} exited with code ${code}`))
    );
  });
}

async function waitFor(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

// 1. Database
const fresh = !existsSync(dataDir);
const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: "dev", password: "dev", port: PG_PORT, persistent: true });
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("budget_app");
console.log(`[db]       Postgres ready on ${PG_PORT}`);

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) c.kill("SIGTERM");
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await runToCompletion("prisma", "npx", ["prisma", "db", "push"], path.join(root, "backend"), { DATABASE_URL });

  // 2. Proxy: injects the backend service token so the frontend works without signing in.
  //    /dev-login sets the session cookie the frontend middleware checks (cookies are shared across localhost ports).
  http
    .createServer((req, res) => {
      if (req.url === "/dev-login") {
        res.writeHead(302, { "Set-Cookie": "better-auth.session_token=dev; Path=/; SameSite=Lax", Location: "http://localhost:3000/" });
        return res.end();
      }
      const headers = { ...req.headers, authorization: `Bearer ${SERVICE_TOKEN}`, host: "localhost:3001" };
      const upstream = http.request({ host: "localhost", port: 3001, path: req.url, method: req.method, headers }, (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
      });
      upstream.on("error", (e) => {
        res.writeHead(502);
        res.end(String(e));
      });
      req.pipe(upstream);
    })
    .listen(3002, () => console.log("[proxy]    Auth proxy ready on 3002"));

  // 3. Backend
  run("backend", "npx", ["tsx", "watch", "src/server.ts"], path.join(root, "backend"), {
    DATABASE_URL,
    SERVICE_TOKEN,
    PORT: "3001",
    BETTER_AUTH_URL: "http://localhost:3000",
  });
  await waitFor("http://localhost:3001/api/health");
  if (fresh) await runToCompletion("seed", "node", ["seed.mjs"], here);

  // 4. Frontend (login is bypassed via /dev-login; real sign-up at /login also works locally)
  run("frontend", "npx", ["next", "dev"], path.join(root, "frontend"), {
    NEXT_PUBLIC_API_URL: "http://localhost:3002/api",
    DATABASE_URL,
    BETTER_AUTH_SECRET: "dev-secret-0123456789abcdef0123456789abcdef",
    APP_BASE_URL: "http://localhost:3000",
  });
  await waitFor("http://localhost:3000/favicon.ico", 120_000);
  console.log("\n  Life Hub is running. Open http://localhost:3002/dev-login to sign in.\n");
} catch (err) {
  console.error(err.message);
  await shutdown();
}
