import type { Metadata } from "next";
import { ArrowRight, Check, ChevronRight, Copy, KeyRound, Plug, Plus, ShieldCheck } from "lucide-react";
import { APP_URL, SIGN_UP } from "@/lib/links";

export const metadata: Metadata = {
  title: "Connect your AI assistant",
  description: "Step by step: add Hive to Claude or ChatGPT as a connector (MCP) so your assistant can read and add to your Hive.",
};

const MCP_URL = `${APP_URL}/api/mcp`;
const VERSION = process.env.NEXT_PUBLIC_BUILD ? `?v=${process.env.NEXT_PUBLIC_BUILD}` : "";

/** A real screenshot of Hive, light or dark with the visitor's theme. */
function HiveShot({ name, alt, className = "" }: { name: string; alt: string; className?: string }) {
  return (
    <figure className={`rounded-2xl border border-line-strong bg-surface overflow-hidden shadow-[0_20px_50px_-30px_rgba(0,0,0,0.35)] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/guide/${name}-light.webp${VERSION}`} alt={alt} loading="lazy" className="shot-light w-full" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/guide/${name}-dark.webp${VERSION}`} alt="" aria-hidden="true" loading="lazy" className="shot-dark w-full" />
    </figure>
  );
}

/** A neutral sketch of an assistant's settings screen; the real one may look different. */
function Sketch({ path, children }: { path: string[]; children: React.ReactNode }) {
  return (
    <figure className="rounded-2xl border border-line-strong bg-surface overflow-hidden shadow-[0_20px_50px_-30px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-1.5 px-4 h-10 border-b border-line bg-surface-2 text-xs text-muted overflow-x-auto whitespace-nowrap">
        {path.map((p, i) => (
          <span key={p} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} aria-hidden="true" />}
            <span className={i === path.length - 1 ? "text-fg font-medium" : ""}>{p}</span>
          </span>
        ))}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
      <figcaption className="px-4 pb-3 text-[11px] text-faint">Illustration. Your assistant&apos;s screens may look a little different.</figcaption>
    </figure>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted mb-1">{label}</p>
      <div className={`h-10 px-3 flex items-center rounded-lg border border-line-strong bg-canvas text-sm truncate ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Step({ n, title, children, visual }: { n: number; title: string; children: React.ReactNode; visual?: React.ReactNode }) {
  return (
    <li className="grid gap-6 md:grid-cols-[1fr_1.1fr] md:gap-10 items-start">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 shrink-0 rounded-full bg-accent text-accent-ink flex items-center justify-center text-sm font-semibold">{n}</span>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        </div>
        <div className="mt-3 text-[15px] text-muted leading-relaxed space-y-2 pl-11">{children}</div>
      </div>
      {visual && <div className="min-w-0">{visual}</div>}
    </li>
  );
}

function CopyAddress() {
  return (
    <Step
      n={1}
      title="Copy your Hive server address"
      visual={<HiveShot name="settings" alt="Hive Settings, AI assistants: the server address with a Copy button" />}
    >
      <p>
        In Hive, open <strong className="text-fg">Settings → AI assistants</strong> and press <strong className="text-fg">Copy</strong>{" "}
        next to the server address. It looks like this:
      </p>
      <p className="font-mono text-sm text-fg break-all rounded-lg bg-surface-2 px-3 py-2">{MCP_URL}</p>
    </Step>
  );
}

function Approve({ n }: { n: number }) {
  return (
    <Step n={n} title="Sign in to Hive and allow access" visual={<HiveShot name="consent" alt="Hive asking: Connect My AI assistant to Hive? with Cancel and Allow" className="max-w-sm mx-auto" />}>
      <p>
        Your assistant opens Hive. Sign in if asked, check the request, and press <strong className="text-fg">Allow</strong>. The
        assistant only ever sees your own data, and you can disconnect it any time in Settings → AI assistants.
      </p>
    </Step>
  );
}

export default function ConnectPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="honeycomb absolute inset-0 -z-10" aria-hidden="true" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-12 sm:pt-20 pb-12 text-center">
          <p className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.14em] text-accent-text">Guide</p>
          <h1 className="text-balance mt-3 text-[40px] leading-[1.05] sm:text-6xl font-semibold tracking-[-0.035em]">
            Connect your AI assistant to Hive
          </h1>
          <p className="mt-5 text-lg text-muted">
            Hive speaks MCP, the standard way AI assistants use outside tools. Add it once and ask your assistant about your
            money, log a transaction or check in a habit, right from a chat.
          </p>
          <nav aria-label="Jump to" className="mt-8 flex flex-wrap justify-center gap-2">
            {[
              ["#claude", "Claude"],
              ["#chatgpt", "ChatGPT"],
              ["#other", "Other assistants"],
              ["#help", "Troubleshooting"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="h-10 px-4 inline-flex items-center rounded-full border border-line bg-surface text-sm font-medium hover:border-line-strong">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Check, title: "What you need", text: "A Hive account (your free month counts) and an assistant plan that allows custom connectors." },
            { icon: ShieldCheck, title: "Your data stays yours", text: "You approve each assistant. It acts only for your account and you can disconnect it at any time." },
            { icon: Plug, title: "About 2 minutes", text: "Copy one address, paste it into your assistant, sign in, allow. That's it." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-line bg-surface p-5">
              <Icon size={18} className="text-accent-text" aria-hidden="true" />
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="claude" className="scroll-mt-20 mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">Claude</h2>
        <p className="mt-2 text-muted">On claude.ai, the desktop app or the mobile app. Connectors you add work everywhere you use Claude.</p>
        <ol className="mt-10 space-y-14">
          <CopyAddress />
          <Step
            n={2}
            title="Add a custom connector"
            visual={
              <Sketch path={["Settings", "Connectors", "Add custom connector"]}>
                <div className="space-y-3">
                  <Field label="Name" value="Hive" />
                  <Field label="Remote MCP server URL" value={MCP_URL} mono />
                  <div className="flex justify-end">
                    <span className="h-9 px-4 inline-flex items-center rounded-lg bg-fg text-canvas text-sm font-medium">Add</span>
                  </div>
                </div>
              </Sketch>
            }
          >
            <p>
              In Claude, open <strong className="text-fg">Settings → Connectors</strong> (on some versions it&apos;s under{" "}
              <em>Customize</em>) and choose <strong className="text-fg">Add custom connector</strong>.
            </p>
            <p>Name it Hive, paste the address into the URL field and press Add. Leave the advanced settings empty.</p>
          </Step>
          <Step
            n={3}
            title="Connect"
            visual={
              <Sketch path={["Settings", "Connectors"]}>
                <div className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <span className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center">
                    <Plug size={16} className="text-accent-text" aria-hidden="true" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Hive</p>
                    <p className="text-xs text-muted truncate">Custom connector</p>
                  </div>
                  <span className="h-8 px-3 inline-flex items-center rounded-lg border border-line-strong text-sm">Connect</span>
                </div>
              </Sketch>
            }
          >
            <p>
              Hive now appears in your connectors. Press <strong className="text-fg">Connect</strong> next to it.
            </p>
          </Step>
          <Approve n={4} />
          <Step
            n={5}
            title="Ask away"
            visual={
              <Sketch path={["New chat", "Tools"]}>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-line px-3 h-10">
                    <span>Hive</span>
                    <span className="w-9 h-5 rounded-full bg-accent relative" aria-hidden="true">
                      <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                    </span>
                  </div>
                  <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent text-accent-ink px-3 py-2">How much did I spend on groceries this month?</p>
                </div>
              </Sketch>
            }
          >
            <p>
              In a chat, make sure Hive is switched on in the tools menu (the <Plus size={13} className="inline -mt-0.5" aria-label="plus" /> or
              tools button), then ask. Claude asks before it changes anything in your Hive.
            </p>
          </Step>
        </ol>
      </section>

      <section id="chatgpt" className="scroll-mt-20 bg-surface border-y border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">ChatGPT</h2>
          <p className="mt-2 text-muted">
            ChatGPT connects to your own MCP servers through Developer mode, available on paid ChatGPT plans (which ones can
            change; check OpenAI&apos;s help centre). Workspace admins may need to allow it first.
          </p>
          <ol className="mt-10 space-y-14">
            <CopyAddress />
            <Step
              n={2}
              title="Turn on Developer mode"
              visual={
                <Sketch path={["Settings", "Apps & Connectors", "Advanced settings"]}>
                  <div className="flex items-center justify-between rounded-lg border border-line px-3 h-11 text-sm">
                    <span>Developer mode</span>
                    <span className="w-9 h-5 rounded-full bg-accent relative" aria-hidden="true">
                      <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                    </span>
                  </div>
                </Sketch>
              }
            >
              <p>
                Open <strong className="text-fg">Settings → Apps &amp; Connectors → Advanced settings</strong> and switch on{" "}
                <strong className="text-fg">Developer mode</strong>.
              </p>
            </Step>
            <Step
              n={3}
              title="Create the connector"
              visual={
                <Sketch path={["Settings", "Apps & Connectors", "Create"]}>
                  <div className="space-y-3">
                    <Field label="Name" value="Hive" />
                    <Field label="Description" value="My money, habits and goals in Hive" />
                    <Field label="MCP server URL" value={MCP_URL} mono />
                    <Field label="Authentication" value="OAuth" />
                    <div className="flex justify-end">
                      <span className="h-9 px-4 inline-flex items-center rounded-lg bg-fg text-canvas text-sm font-medium">Create</span>
                    </div>
                  </div>
                </Sketch>
              }
            >
              <p>
                Back in <strong className="text-fg">Apps &amp; Connectors</strong>, press <strong className="text-fg">Create</strong>.
                Name it Hive, add a short description (ChatGPT reads it to know when to use Hive), paste the address and pick{" "}
                <strong className="text-fg">OAuth</strong> as the authentication. Confirm and create.
              </p>
            </Step>
            <Approve n={4} />
            <Step
              n={5}
              title="Use it in a chat"
              visual={
                <Sketch path={["New chat", "Developer mode"]}>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 rounded-lg border border-line px-3 h-10">
                      <Plug size={14} className="text-accent-text" aria-hidden="true" />
                      <span>Hive</span>
                    </div>
                    <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent text-accent-ink px-3 py-2">Log CHF 18 for lunch today.</p>
                  </div>
                </Sketch>
              }
            >
              <p>
                Start a chat, choose Developer mode from the tools menu and select Hive. ChatGPT asks you to confirm before it
                adds or changes anything.
              </p>
            </Step>
          </ol>
        </div>
      </section>

      <section id="other" className="scroll-mt-20 mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">Other assistants</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <Plug size={18} className="text-accent-text" aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Any MCP assistant with sign-in</h3>
            <p className="mt-2 text-sm text-muted">
              Add Hive as a remote (HTTP) MCP server with the address above. Hive supports the standard MCP sign-in, so the
              assistant opens Hive for you to approve it, as in step 4 above.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <KeyRound size={18} className="text-accent-text" aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Tools that ask for a token (Pro)</h3>
            <p className="mt-2 text-sm text-muted">
              Create a personal access token in Settings → AI assistants and send it as{" "}
              <code className="font-mono text-fg">Authorization: Bearer &lt;token&gt;</code>. Keep it secret; you can revoke it any time.
            </p>
          </div>
        </div>
      </section>

      <section id="help" className="scroll-mt-20 bg-surface border-y border-line">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em]">Troubleshooting</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {[
              ["The sign-in window doesn't open", "Check that you pasted the full address, ending in /api/mcp, with nothing before or after it. Then remove the connector and add it again."],
              ["\"Connecting an AI assistant needs an active Hive trial or plan\"", "Your free month or plan has ended. Choose a plan in Hive's Settings, then connect again."],
              ["My assistant doesn't use Hive", "Make sure Hive is switched on for the chat (tools menu), and ask about your Hive data explicitly, for example \"In Hive, what did I spend on dining out last month?\""],
              ["I can't find the connector settings", "Custom connectors depend on your assistant's plan and version. Check the help centre of Claude or ChatGPT for the current steps."],
              ["How do I disconnect?", "In Hive, Settings → AI assistants → Connected assistants → Disconnect. You can also remove the connector in your assistant."],
            ].map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex items-start justify-between gap-6 cursor-pointer list-none text-lg font-medium">
                  {q}
                  <span className="mt-1 text-muted text-xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[15px] text-muted leading-relaxed pr-8">{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
            <a href={SIGN_UP} className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-ink font-semibold hover:brightness-95">
              Start your free month <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href={`${APP_URL}/settings`} className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-canvas font-medium">
              <Copy size={16} aria-hidden="true" /> Open Hive settings
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
