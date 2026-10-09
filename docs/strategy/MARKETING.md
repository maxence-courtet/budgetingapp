# Marketing strategy

Small budget, founder-led, privacy-first. The goal for the first 6 months: **500 trial sign-ups and 50–100 paying users**, learning which message and channel convert.

## Who Hive is for

1. **Hands-on budgeters in Switzerland and Europe** who plan each month (salary in, rent and insurance out, savings aside) and want a calm, private tool, not a bank-linked dashboard. Many already use spreadsheets.
2. **FIRE / savings-rate people** (financial independence): they track net worth, savings rate and investments monthly. Switzerland has a very active FIRE community.
3. **AI power users** who live in Claude or ChatGPT and want their own finances available to their assistant. Hive is one of the first budgeting apps with a hosted MCP connector: this is the sharpest differentiator.
4. **Self-improvers** who track habits and goals and like seeing them next to money.

## Positioning

> **Hive: your money and the rest of your life, side by side. Private, calm, and it works with the AI you already use.**

Proof points to repeat everywhere:
- Plan a typical month once, see every month against it.
- A ring that shows where the money went, transfers to savings included.
- Habits, goals, fitness and notes in the same app, only if you want them.
- Ask Claude or ChatGPT about your money (MCP), with your approval.
- Swiss-made, no ads, no trackers, export or delete everything any time.
- First month free, no card.

Avoid: claims about bank sync (there is none), investment advice, "AI that manages your money" (there is no AI inside Hive).

## Channels, in priority order

### 1. Communities (free, highest intent)
| Where | How | Notes |
|---|---|---|
| **Mustachian Post** (Swiss FIRE blog and forum) | Join the forum, contribute, then share Hive in the tools thread; propose a guest post "How I plan my month in Switzerland" | Read the rules; be a member first |
| **Reddit**: r/PersonalFinanceSwitzerland, r/eupersonalfinance, r/financialindependence, r/ClaudeAI, r/ChatGPT, r/mcp, r/productivity | Share genuinely useful posts (your monthly template, how you connected your budget to Claude), mention Hive where allowed; answer questions | Most subs ban pure self-promotion; follow each sub's rules; never fake reviews |
| **Hacker News** (Show HN) | "Show HN: Hive, a budgeting app with a hosted MCP server" with a technical write-up | Post on a weekday morning US time; reply to every comment |
| **Indie Hackers**, **Product Hunt** | Build-in-public posts; one planned Product Hunt launch with a short demo video | Prepare: gallery images, maker comment, first-hour supporters |
| **Swiss tech/startup Slacks and Discords**, LinkedIn | Founder story posts | LinkedIn works well in Switzerland for B2C founder stories |

### 2. MCP and AI directories (free, unique to Hive)
Submit the Hive connector (app URL `/api/mcp`, link to the `/connect` guide) to MCP server directories and lists, for example: the official MCP servers registry, PulseMCP, Smithery, Glama, mcp.so, and the community "awesome MCP servers" lists on GitHub. Also share in the Claude and ChatGPT communities a short clip of asking "what did I spend on dining out?" and getting the answer from Hive.

### 3. Content and SEO (slow, compounding)
Publish on the website (add a `/blog` section later) and cross-post to LinkedIn / Medium:
- "How to budget in Switzerland: a monthly template (with numbers)"
- "Savings rate: the one number to track, and how"
- "Connect your budget to Claude (or ChatGPT) in 2 minutes"
- "YNAB alternatives for Switzerland and Europe" (honest comparison)
- "Habits and money: what tracking both taught me"
Target long-tail searches; each article links to the free month.

### 4. Short video (free, organic)
15–30 s screen recordings: the spending ring filling in, adding a transaction in 3 seconds, asking Claude about the month. Post to Instagram Reels, TikTok, YouTube Shorts, LinkedIn. Use the prompts in [AI_CONTENT_PROMPTS.md](AI_CONTENT_PROMPTS.md).

### 5. Referrals (later)
"Give a month, get a month": each paying user gets a link; both get a free month. Needs a referral code at sign-up (small backend change: store `referredBy`, extend `planExpiresAt`).

### 6. Paid ads (small, test-driven)
See [ADVERTISING.md](ADVERTISING.md).

## Launch plan (first 8 weeks)

| Week | Do |
|---|---|
| 1 | Fill legal details, production deploy, payments live. Set up UTM tracking on all links. Collect 10 beta users from friends/communities for feedback and first testimonials. |
| 2 | MCP directories submissions. Publish the `/connect` guide clip. |
| 3 | Mustachian Post + Reddit (r/PersonalFinanceSwitzerland) posts. |
| 4 | Show HN. |
| 5 | Product Hunt launch (Tuesday–Thursday). |
| 6–8 | Two articles, weekly short videos, start ads test (ADVERTISING.md). Review numbers every Friday. |

## Measure

Without trackers: use UTM parameters (`?utm_source=reddit&utm_campaign=launch`) on every link and record the first-touch source at sign-up (small change: store `signupSource` on the user). If you add web analytics, choose a cookieless, EU-hosted tool (e.g. Plausible) and update the privacy policy.

Weekly dashboard: visits per channel, trial starts, trial → paid, cost per trial and per paying user (ads), churn.
