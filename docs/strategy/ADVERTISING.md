# Advertising strategy (limited budget)

Budget assumption: **CHF 300 per month** for 3 months, then scale only what pays back. Everything here works without tracking pixels, which keeps Hive consistent with its "no trackers" promise (adding Meta/Google pixels would need cookie consent and a privacy policy update).

## Principles

1. **Organic first.** Communities, MCP directories and content (MARKETING.md) are free and convert better. Ads amplify what already works.
2. **Test small, cut fast.** Each test gets a fixed budget (CHF 50–100) and a stop rule. Keep only ads with **cost per trial ≤ CHF 5** and **cost per paying user ≤ CHF 30** (3–6 months of revenue).
3. **Measure without pixels.** Every ad link carries UTM parameters; the app records the first source at sign-up. Compare trials and paid conversions per campaign.
4. **One message per ad.** "Plan your month once" or "Ask Claude about your money" or "Private, Swiss-made, no ads", not all at once.

## Where to spend, in order

| # | Channel | Why | Budget / month | Targeting |
|---|---|---|---|---|
| 1 | **Newsletter / podcast sponsorship** (Swiss personal finance, FIRE, AI tools newsletters) | Trusted voice, high intent, no tracking needed | CHF 100–200 per placement | Pick ones whose audience matches (check open rates; ask for a reader discount code) |
| 2 | **Reddit Ads** | Reach by subreddit interest; cheap clicks; matches where your audience talks | CHF 100 | Communities: personal finance (CH/EU), FIRE, ClaudeAI/ChatGPT; countries CH, DE, AT, NL |
| 3 | **Google Search Ads** | Captures people actively looking | CHF 100 | Long-tail, exact/phrase match: "budget app switzerland", "ynab alternative", "budgeting app with claude", "haushaltsbudget app schweiz". Avoid broad "budget app" (expensive) |
| 4 | **Product Hunt / directory featured spots** | One-off visibility in the tech crowd | Only around launch | — |
| 5 | Meta / TikTok ads | Large reach but need pixels for efficiency; use only boosted organic posts that already perform | CHF 0–50 | Boost the best organic video to a lookalike-free interest audience |

Skip for now: display/banner networks, influencer deals with big creators (expensive, low intent), app-install campaigns (Hive is web-first).

## 3-month test plan

| Month | Spend | Tests |
|---|---|---|
| 1 | CHF 300 | Google Search (3 keyword groups, CHF 100), Reddit (2 creatives × 2 communities, CHF 100), 1 newsletter sponsorship (CHF 100) |
| 2 | CHF 300 | Double down on the best of month 1; new creative angle on the second best; drop the worst |
| 3 | CHF 300 | Scale the winner to CHF 200; test one podcast or newsletter; keep CHF 100 for a Product Hunt/launch week boost |

After 3 months: if one channel delivers paying users at ≤ CHF 30 each, increase its budget by 50% per month while the cost holds.

## Creatives to prepare

- **Static**: the spending ring with the headline "See where your money went", a phone showing a month with "Plan your month once"; the chat illustration "Ask Claude about your money".
- **Video (6–15 s)**: adding a transaction in 3 seconds; the ring animating in; Claude answering "You spent CHF 570 on dining out".
- **Copy variants** (use AI_CONTENT_PROMPTS.md):
  - "Your money and the rest of your life, side by side. First month free."
  - "Plan your month once. See every month against it."
  - "Ask Claude what you spent. Hive answers, with your permission."
  - "Swiss-made budgeting. No ads, no trackers, export anytime."

Always link to the matching page with UTM tags, e.g. `https://<website>/?utm_source=reddit&utm_medium=paid&utm_campaign=ring_v1`.

## Rules to respect

- No claims you can't prove ("best", "saves you CHF 500"), no fake urgency, no fake testimonials (Swiss UWG, EU unfair commercial practices rules, platform policies).
- Finance ads on Google and Meta may need advertiser verification; budgeting tools usually aren't restricted financial services, but expect a review.
- Reddit: disclose ads clearly; organic posts must follow each community's rules.
