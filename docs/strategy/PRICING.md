# Pricing strategy

## Current offer (as on the website)

| | Plus | Pro |
|---|---|---|
| Monthly | CHF 4 | CHF 6 |
| Yearly | CHF 40 (2 months free) | CHF 60 |
| Free trial | First month free, no card, no automatic charge | same |
| What you get | Money (unlimited accounts, transactions, templates, reports), every Life module, connect your AI assistant (MCP), export anytime | Plus + personal access tokens, early access, priority support |

Source of truth: `website/src/lib/plans.ts` (marketing) and `backend/src/services/plans.ts` (enforcement). Change both together.

## How the market prices this

Reference prices for budgeting apps (third-party reviews, mid/late 2026; check current prices before quoting them publicly):

| App | Monthly | Yearly | Trial | Notes |
|---|---|---|---|---|
| YNAB | ~USD 14.99 | ~USD 109 | 34 days, no card | Bank sync, strong method/community |
| Monarch Money | ~USD 14.99 | ~USD 99.99 | 7 days, card required | Bank sync, partner seat |
| Copilot Money | ~USD 13 | ~USD 95 | 1 month | Apple-only |
| **Hive Plus** | **CHF 4** | **CHF 40** | **1 month, no card** | Manual entry, habits/goals/fitness, MCP, CH/EU privacy |

Hive is 2–3× cheaper than the leaders. That is right *today* because Hive has no automatic bank sync (everything is entered by hand or by an assistant) and no brand yet. It is too cheap once the product proves itself.

## Recommendations

1. **Keep the free month, no card.** It matches the strongest competitor (YNAB) and builds trust; conversions are lower than card-required trials, but it suits a privacy-first brand. Measure: trial → paid conversion (aim for 8–15% without card).
2. **Launch as "founding member" pricing.** Keep CHF 4 / CHF 40 for the first 300–500 paying users and **lock it for them for life**. Say so on the pricing page. This rewards early adopters and makes the later increase easy to explain.
3. **Then move Plus to CHF 6/month or CHF 60/year** for new customers. Still about half of YNAB/Monarch; ARPU +50%.
4. **Make Pro worth its price or merge it.** Today Pro differs only by tokens, early access and support, which few people need. Options:
   - add real Pro-only value (e.g. multi-currency, CSV import with rules, shared household with a second seat, longer history/forecasts), then price it at CHF 9–10/month; or
   - drop Pro and offer a **Household** plan (2 seats, CHF 8–9/month) once sharing exists. Couples are a big segment (Monarch's partner seat is a selling point).
5. **Yearly by default.** Show yearly first (already done), with "2 months free". Yearly plans cut churn and payment fees.
6. **Price in CHF and EUR.** Add EUR prices (round: EUR 4 / 40) when you start marketing in the EU. Most payment providers handle both.
7. **No lifetime deals.** They bring bargain hunters, not loyal users, and a lifetime of hosting costs.
8. **Student / hardship discount** on request (50%), a cheap way to earn goodwill in communities.

## Unit economics (rough, check with real numbers)

- Payment fees: ~3% + fixed per transaction; yearly billing keeps the fixed part small.
- Hosting: a few dollars per month per service at small scale; marginal cost per user is tiny (text rows only). Gross margin > 90% once past ~100 paying users.
- **Target customer acquisition cost (CAC)**: below 3 months of revenue at first (≈ CHF 12 at CHF 4/month), later below 6 months (≈ CHF 36 at CHF 6/month).
- **Lifetime value**: CHF 4 × 18 months average ≈ CHF 72 → CHF 108 at CHF 6. Keep CAC under a third of LTV.

## What to measure

Trial starts, trial → paid conversion, monthly vs yearly mix, churn per month, revenue per user, refund/withdrawal rate, and which acquisition channel each paying user came from (UTM parameters on links, recorded at sign-up).
