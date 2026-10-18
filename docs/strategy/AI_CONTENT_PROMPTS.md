# Prompts for AI-made promotional content

Copy a prompt, fill the `{braces}`, paste it into the tool named. Always review the output: check every claim against [MARKETING.md](MARKETING.md) ("what to avoid"), and never let generated content invent features (no bank sync, no built-in AI), reviews or numbers.

## Brand kit (paste this first in any text conversation)

```
You are writing for Hive, a personal finance app from Switzerland.
- Promise: "Your money and the rest of your life, side by side."
- What it does: plan a typical month once (budget template) and track every month against it; a ring shows where
  the money went, including transfers to savings and investments; net worth chart; optional modules for habits,
  fitness, goals, notes and a journal; connect your own AI assistant (Claude, ChatGPT) via MCP to ask questions
  about your money or log transactions from a chat.
- What it does NOT do: no automatic bank sync, no AI inside the app, no investment advice. Never claim otherwise.
- Values: calm, private (no ads, no trackers, export or delete your data any time), Swiss-made, fair price.
- Offer: first month free, no card. Then Plus CHF 4/month or CHF 40/year; Pro CHF 6/month.
- Voice: plain, warm, precise. Short sentences. No hype words ("revolutionary", "game-changer"), no emoji spam,
  no fake urgency. Speak to "you". British spelling is fine.
- Visual identity: honey yellow #F5B31F accent, near-black #0B0B0C, off-white #FAFAF8, generous white space,
  rounded cards, a subtle honeycomb (hexagon) pattern, Geist-style clean sans-serif type.
```

## Images (Midjourney, DALL·E / ChatGPT images, Ideogram, Gemini, Firefly)

Use real app screenshots (`website/public/screens/`) for anything that shows the product; use generated images only for mood and backgrounds, so ads never misrepresent the app.

**Hero / background**
```
Minimal editorial illustration, a soft honeycomb pattern of thin hexagon outlines fading into an off-white
background (#FAFAF8), one hexagon filled with warm honey yellow (#F5B31F), lots of negative space on the right for
text, calm and premium, flat vector, no text, no people, 16:9.
```

**Lifestyle (social posts, article headers)**
```
Calm morning scene, a person's hands holding a phone over a wooden table with a coffee, the phone screen is blank
white (to place a real screenshot later), soft natural light, muted palette with one honey-yellow accent object,
Scandinavian interior, shot on 35mm, shallow depth of field, no logos, no text, 4:5.
```

**Concept: money and life side by side**
```
Flat vector illustration of three hexagon cells side by side: one with a small coin stack, one with a running shoe,
one with a checklist; honey yellow #F5B31F on near-black #0B0B0C lines, off-white background, geometric, friendly,
no text, square.
```

**Mock device frame for a real screenshot** (then paste the screenshot in Figma/Canva)
```
Clean product mockup of a modern smartphone at a slight angle on a plain off-white surface, soft shadow, empty
white screen, minimal, studio light, no text, no brand, 4:5.
```

## Short video (Sora, Veo, Runway, Kling; or edit screen recordings in CapCut)

Best results: record the real app (phone screen recording) and use AI only for an intro/outro shot.

**Intro shot (3 s)**
```
Slow push-in on a single honey-yellow hexagon forming from thin lines on an off-white background, other hexagon
outlines appear around it like a honeycomb, calm, minimal motion design, 3 seconds, no text.
```

**Script for a 20-second reel** (ask Claude/ChatGPT with the brand kit)
```
Write a 20-second vertical video script for Hive showing {feature: "the spending ring" | "adding a transaction in
3 seconds" | "asking Claude what I spent on dining out"}. Format: 4 shots with timing, on-screen text (max 6 words
each), and a one-line voice-over per shot. End with "First month free" and the app name. Only describe real screen
recordings of the app.
```

## Text

**Ad copy variants**
```
Write 10 ad variants for {platform: Reddit | Google Search | LinkedIn} promoting Hive to {audience: people in
Switzerland who budget monthly | FIRE / savings-rate trackers | Claude and ChatGPT power users}.
For Google: headline max 30 characters, description max 90. For Reddit: title max 150 characters and 1-2 sentence
body. One idea per ad. Include "First month free" in half of them. No exaggeration, no claims not in the brand kit.
```

**Social posts (LinkedIn, X, Threads)**
```
Write 5 short posts (max 600 characters) for a founder building Hive in public. Topics: {topic, e.g. "why we
removed the free plan and offer a free month instead" | "why Hive has no trackers" | "connecting your budget to
Claude"}. Personal, specific, one takeaway each, end with a soft call to action and the link {url}.
```

**Reddit post (value first, community rules respected)**
```
Write a helpful Reddit post for r/{subreddit} sharing {useful thing, e.g. "my monthly budget template for living in
Zurich, with real categories and percentages"}. 300-500 words, no marketing tone. Mention at the end, in one line,
that I made a small app (Hive) that does this, and that the template works in a spreadsheet too. Follow typical
self-promotion rules: value first, disclose that I'm the maker.
```

**SEO article**
```
Write a 1,200-word article titled "{title, e.g. How to budget in Switzerland: a monthly template}" for the Hive
blog. Audience: {audience}. Structure: short intro, H2 sections, a practical template table, common mistakes, and
a closing section mentioning Hive's free month in 2 sentences. Use correct Swiss specifics only if you are sure
(health insurance, 3rd pillar, taxes); mark anything uncertain as [CHECK]. No invented statistics.
```

**Product Hunt listing**
```
Write a Product Hunt listing for Hive: tagline (max 60 characters), description (max 260 characters), 5 gallery
image captions, and the maker's first comment (200-300 words: why I built it, what's unique (MCP connector, money
+ habits side by side, Swiss privacy), what feedback I want, the free-month offer).
```

**Newsletter sponsorship blurb**
```
Write a 60-word sponsor blurb for {newsletter name}, audience {audience}. One clear benefit, the free-month offer,
the link {url with utm}. Calm tone, no hype.
```

**Carousel (LinkedIn/Instagram, 6 slides)**
```
Create a 6-slide carousel: "{topic, e.g. 5 numbers to check at the end of every month}". Each slide: a title (max
8 words) and 1-2 lines of body. Slide 6: "Hive tracks all five. First month free." Keep it useful even without
the app.
```

## Where to publish what

| Content | Where | Cadence |
|---|---|---|
| Founder posts, carousels | LinkedIn (strong in CH), X/Threads | 2× per week |
| 15–30 s screen videos | Instagram Reels, TikTok, YouTube Shorts, LinkedIn | 1–2× per week |
| Helpful posts + template | Reddit (r/PersonalFinanceSwitzerland, r/eupersonalfinance, r/financialindependence; r/ClaudeAI, r/ChatGPT, r/mcp for the MCP angle), Mustachian Post forum | 2× per month, follow each community's rules |
| Launch | Product Hunt, Hacker News (Show HN), Indie Hackers | Once each, planned |
| MCP connector listing | MCP registries and directories, "awesome MCP servers" GitHub lists | Once, keep updated |
| Articles | Website blog (to add), cross-post to Medium/LinkedIn articles | 2× per month |
| Paid placements | Newsletters, Reddit Ads, Google Search (see ADVERTISING.md) | Per test plan |

Tag every link with UTM parameters so you can see which content brings trials.
