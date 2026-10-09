# Compliance: data protection and consumer law

What Hive does to meet Swiss and EU rules, and what is still to do before launch. This is a working checklist, not legal advice: have a Swiss lawyer review the terms and privacy policy once before going live (a fixed-fee review is typically affordable and worth it for a finance app).

## Which rules apply

| Rule | Why it applies | Key duties |
|---|---|---|
| **Swiss Federal Act on Data Protection (nFADP / revDSG)**, in force since 1 Sept 2023 | Hive is run from Switzerland and processes personal data | Privacy notice before collection; data security; rights of access, portability, erasure; explicit consent for sensitive data (health); records of processing; breach notification to the FDPIC as soon as possible |
| **EU GDPR** | Hive offers its service to people in the EU | Legal basis per processing; art. 9 explicit consent for health data; rights (arts. 15–22); art. 27 EU representative; processor agreements (art. 28); breach notification within 72 h |
| **Swiss Unfair Competition Act (UWG) art. 3 para. 1 lit. s** | Online service in e-commerce | Clear identity and contact address incl. a real e-mail; technical means to correct input errors before ordering; prompt electronic order confirmation |
| **EU Consumer Rights Directive (2011/83/EU)** and CJEU *Sofatutor* (C-565/22) | Paid subscriptions sold to EU consumers | Clear pre-contract information (price, renewal, trial terms); 14-day right of withdrawal with model wording; one withdrawal right at the start when the trial terms were clearly disclosed |
| **Swiss Code of Obligations** | Contract law for the subscription | Clear terms; liability cannot exclude intent or gross negligence (art. 100) |

## What is implemented

| Requirement | Where |
|---|---|
| Privacy policy (controller, purposes, legal bases, recipients, transfers, retention, rights, complaint authority) | Website `/legal/privacy` |
| Terms of service (trial, plans, renewal, cancellation, EU withdrawal right with model wording, liability, governing law) | Website `/legal/terms` |
| Legal notice / identification (UWG) | Website `/legal/notice`, linked in every page footer |
| Terms accepted at sign-up, with version and date stored | Sign-up checkbox; `User.termsAcceptedAt`, `User.termsVersion` (version `2026-10-09`) |
| Free trial disclosed before sign-up; no automatic conversion to paid | Sign-up page, pricing page, terms §2 |
| Right of access and portability: full export as JSON | Settings → Your data → Download (`/api/account/export`: app data + sign-in records) |
| Right to erasure: self-service account deletion | Settings → Your data → Delete my account (`/api/account/delete`) |
| Right to rectification | Everything is editable in the app |
| Health data (Fitness: weight, measurements, workouts) only with explicit consent; withdrawable, withdrawal deletes the data | Consent step on the Fitness page; `User.healthConsentAt`; Settings → Your data; API refuses Fitness without consent |
| Data minimisation: no analytics, no ad trackers, no AI model inside Hive | Website and app have no tracking; only strictly necessary cookies, so no cookie banner is required |
| Security: HTTPS, hashed passwords and API keys, short-lived JWTs, per-user scoping on every query, rate limits | Better Auth, backend middleware |
| Assistants (MCP) act only for the approving user; revocable | OAuth consent page, Settings → AI assistants |
| Data kept when a trial or plan ends, export and deletion still available | Plan guards exempt `/api/me` and `/api/account/*` |

## Before launch (to do)

1. **Fill operator details** in `website/src/lib/company.ts` (name or company, address, real e-mail inbox, privacy e-mail, UID/register and VAT if any, hosting region). The legal pages show a "draft" notice until every placeholder is replaced.
2. **EU representative (GDPR art. 27)**: needed once you regularly serve EU residents. Services exist from roughly EUR 100–300 per year; add the name and address in `company.ts`.
3. **Hosting region**: choose the Railway region for production (EU West / Amsterdam recommended for EU/CH users), and confirm it in the privacy policy.
4. **Processor agreements**: accept Railway's Data Processing Agreement (and the payment provider's) and keep copies. Check Railway's transfer mechanism (Data Privacy Framework certification or SCCs) matches section 5 of the privacy policy.
5. **Backups and logs**: confirm Railway's backup retention and log retention; the privacy policy says up to 30 days for both. Adjust either the settings or the text.
6. **Record of processing activities** (nFADP art. 12, GDPR art. 30): a short table of processing purposes, data categories, recipients, retention, security. The table in the privacy policy is a good start; keep it in a private document.
7. **Breach procedure**: who decides, how to notify the FDPIC ("as soon as possible") and EU authorities (72 h), and users when they are at risk. One page is enough.
8. **Payments**: when adding the provider:
   - show price, billing period, renewal and cancellation terms right before purchase, with a clear "Pay" button (UWG error correction + confirmation e-mail);
   - send an order confirmation and invoices;
   - remind users before a yearly renewal (terms §3 promises this);
   - implement the EU withdrawal refund (pro rata) and a cancellation flow in Settings;
   - add the provider to the privacy policy recipients.
9. **E-mail**: add a transactional e-mail provider for trial-ending reminders, receipts and security notices; list it in the privacy policy.
10. **Retention for inactive accounts**: today data is kept until the user deletes it. Consider deleting accounts whose trial/plan ended more than 24 months ago, after an e-mail warning, and state it in the policy.
11. **Existing users** (grandfathered): they never saw the new terms. Show a one-time "updated terms" notice in the app or e-mail them before launch; they also need to give health-data consent the next time they open Fitness (already enforced).
12. **Age**: the terms require 18+. If you want to enforce it, add a confirmation at sign-up.

## Handling a data request

- **Access / export**: point the user to Settings → Your data → Download. By e-mail: answer within 30 days.
- **Deletion**: Settings → Delete my account, or delete for them. Backups age out within the retention window.
- **Health consent withdrawal**: Settings → Your data → Withdraw consent (deletes Fitness data).
- Keep a short log of requests and answers (date, type, done).
