# Instagram kit

Ready-to-post visuals in [`out/`](out/), built from the templates in [`build.mjs`](build.mjs). All numbers are invented (showcase data), in CHF.

| File | Format | Use |
|---|---|---|
| `post-1-ring.png` … `post-6-life.png` | 1080×1350 (4:5 feed) | Feed posts and feed ads |
| `carousel-1.png` … `carousel-7.png` | 1080×1350, 7 slides | One carousel post (save-worthy content) |
| `story-1-offer.png`, `story-2-ring.png` | 1080×1920 (9:16) | Stories and story ads |
| `reel-1-ring.mp4`, `reel-2-assistant.mp4`, `reel-3-brand.mp4` | 1080×1920, 30 fps, 8–12 s, silent | Reels and reel ads (`*-cover.png` = cover image) |

Reels are silent on purpose: add a trending, licensed track from Instagram's own music library when posting (music from the library is cleared for organic posts; for ads use Meta's Sound Collection).

## Rebuild or edit

```bash
cd marketing/instagram
npm install              # Playwright; set CHROMIUM_PATH to use an existing Chromium instead of downloading
node build.mjs           # everything (reels take about a minute)
node build.mjs post-3    # only items whose id starts with "post-3"
```

Text, colours and timings are in `build.mjs`. App screenshots are in `assets/` (taken from the local showcase account in CHF; replace them after UI changes).

## Captions

Keep the link in bio pointed at the website with UTM tags, e.g. `?utm_source=instagram&utm_medium=social&utm_campaign=<file>`.

**post-1-ring** — See where your money went
> Every month in Hive gets a ring: where the money went, including what you moved to savings and investments. So a good month actually looks like one. 🟡
> First month free, no card. Link in bio.
>
> Alt text: A phone showing Hive's monthly report: a ring split into rent, groceries, savings, dining out, investing and other, with CHF amounts.

**post-2-plan** — Plan your month once
> Describe a typical month once (salary in, rent and insurance out, savings aside) and apply it to every month in one tap. Then just tick things off as they're paid.
> Try it free for a month. Link in bio.
>
> Alt text: Hive on a phone in dark mode: September with money in, money out and what's left, and a list of transactions.

**post-3-assistant** — Ask your AI about your money
> Hive connects to Claude, ChatGPT and other assistants that support MCP. Ask what you spent on dining out, or log a lunch from the chat. Your assistant only sees your own data, and you can disconnect it any time.
> Setup takes about 2 minutes: the guide is on our website.
>
> Alt text: A chat: "How much did I spend eating out last month?" Answer: "CHF 570 across 6 visits, CHF 330 over your plan." Then "Log CHF 18 for lunch today." "Added to October under Dining out."

**post-4-privacy** — No ads. No trackers. No selling.
> Your finances are personal. Hive is paid for by subscriptions, so there's no reason to look at, sell or share your data. Export everything or delete your account whenever you like. Made in Switzerland.
>
> Alt text: Large text: No ads. No trackers. No selling.

**post-5-offer** — One month free
> Use all of Hive free for a month. No card, and nothing is charged automatically: when the month ends, you choose. Then CHF 4 a month, or CHF 40 a year.
>
> Alt text: Hive logo and the text "One month free. No card." with Plus at CHF 4 per month and yearly at CHF 40.

**post-6-life** — Your money and the rest of your life
> Money comes first, but it's not the only thing worth tracking. Turn on habits, goals, fitness and notes when you want them, and keep them next to your budget.
>
> Alt text: Two phones showing Hive's habits with streaks and goals with progress bars.

**carousel (7 slides)** — 5 numbers to check at the end of every month
> Five numbers, five minutes, at the end of every month. Save this for the 30th. 📌
> 1 Savings rate · 2 Spending vs plan · 3 Biggest category · 4 Money moved aside · 5 Net worth change.
> Hive tracks all five for you. First month free, link in bio.

**reel-1-ring** — "See where it went" (9 s)
> Your month, in one ring. 🟡 #budgeting

**reel-2-assistant** — "Just ask" (12 s)
> When your budget talks to Claude. Ask, log, done.

**reel-3-brand** — brand film (8 s)
> Your money and the rest of your life, side by side. Hive: first month free.

**Hashtags** (pick 5–8 per post, mix big and niche): `#budgeting #budgetplanner #personalfinance #moneytips #savingmoney #finanzen #sparen #geldsparen #schweiz #swissfinance #fire #financialfreedom #productivity #habits #claudeai #chatgpt`

## Posting plan (first 4 weeks)

| Week | Feed | Reels | Stories |
|---|---|---|---|
| 1 | post-5-offer (pin it), post-1-ring | reel-3-brand | story-1-offer |
| 2 | carousel, post-4-privacy | reel-1-ring | story-2-ring + a poll "Do you track your savings rate?" |
| 3 | post-3-assistant, post-2-plan | reel-2-assistant | Link sticker to the /connect guide |
| 4 | post-6-life | Best reel again with a new hook/caption | story-1-offer |

Best times to test: weekday lunchtime and 19:00–21:00 local time. Reply to every comment in the first hour.

## Using them as ads

Follows [ADVERTISING.md](../../docs/strategy/ADVERTISING.md): small tests, no tracking pixels, UTM links only.

- **Start with**: reel-1-ring and reel-2-assistant (Reels placement), post-1-ring and post-5-offer (Feed), story-1-offer (Stories). One message per ad.
- **Budget**: boost the best-performing organic post first (CHF 30–50 over 5–7 days) before running cold ads.
- **Targeting**: Switzerland (+ DE/AT later), 22–45, interests: personal finance, budgeting, saving, FIRE, productivity apps, ChatGPT/Claude.
- **Stop rule**: pause any ad whose cost per website visit is above CHF 1 after CHF 20 spent; keep the ones that bring trials at ≤ CHF 5.
- **Rules**: no claims we can't prove, no fake urgency or testimonials, label it as an ad (Meta does this automatically). Finance-adjacent ads can get an extra review: budgeting tools are usually allowed.
