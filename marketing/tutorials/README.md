# Tutorial videos

Short how-to videos (1080×1920, with voice-over and captions) presented by **Mia**, an illustrated Hive host. The phone shows the **real app** being used: every screen was captured from the app with the showcase account (invented data, CHF), and a finger shows each tap.

| Video | Length | Shows |
|---|---|---|
| [`out/1-add-transaction.mp4`](out/1-add-transaction.mp4) | 39 s | Log a purchase with the + button; it lands in the right month |
| [`out/2-plan-month.mp4`](out/2-plan-month.mp4) | 45 s | A budget template and its ring, applied to a new month, ticking an item off |
| [`out/3-where-it-went.mp4`](out/3-where-it-went.mp4) | 37 s | Reports by month with the ring, then net worth over all time |

Each video has a cover image (`*-cover.png`) and its full script (`*.txt`, use it for captions/subtitles and the post text).

## Where to use them

- **Instagram Reels / TikTok / YouTube Shorts**: post as-is (they have voice and burned-in captions). Caption: the video title + one line from the script + "First month free, link in bio".
- **Website**: embed on `/how-it-works/` or the `/connect/` guide; and in the app's help later.
- **Onboarding emails**: link "Watch: log your first purchase (39 s)".
- **Ads**: 1-add-transaction works best as an ad (fast, concrete). Cut the first 15 s if the platform needs shorter.

## Rebuild

```bash
cd marketing/tutorials
npm install                          # Playwright (or set CHROMIUM_PATH to an existing Chromium)
# 1. Capture the flows from a running app (local dev stack with the showcase account):
FE=http://localhost:3000 BE=http://localhost:3001/api node capture.mjs
# 2. Voice + render (Python 3 with `pip install kokoro-onnx soundfile`, and the two Kokoro model files
#    kokoro-v1.0.onnx + voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx/releases):
TTS_PY=python3 KOKORO_MODELS=./models node compose.mjs        # or: node compose.mjs 2  (one video)
```

- **Change what Mia says**: edit `SCRIPTS` in `compose.mjs` (one line per captured step; the tap happens at the end of the line).
- **Change the flow**: edit `capture.mjs` (each `r.tap(...)` is one step), re-capture, then make sure there's one script line per step.
- **Other voice**: `VOICE=af_bella` / `bf_emma` (British) / `am_michael` (male), see the Kokoro voice list.
- Re-capture after UI changes so the videos always show the current app.

## Want a real-looking presenter?

Mia is an illustration because this setup can't film a person. For a photo-real presenter, use an AI avatar tool (HeyGen, Synthesia, D-ID or Captions.ai) with the scripts in `out/*.txt`, then put the avatar on top of the app recording:

1. Export a version without Mia: in `compose.mjs` hide `.host` and `.tag` (set `display:none`) and render; keep the voice track or mute it.
2. In the avatar tool, pick a presenter (or record yourself once to create a personal avatar), paste the script, choose a calm, friendly voice, and export with a green/transparent background.
3. Layer the avatar bottom-left over the recording (CapCut, Descript or the tool's own editor).

Prompt for the avatar's look and delivery, if the tool asks:
> A friendly, smart-looking presenter in her early 30s, glasses, navy blazer over a white top, warm natural light, neutral light background. Calm, clear, upbeat delivery; speaks to camera like explaining to a friend; small natural hand gestures; no exaggerated expressions.

Rules: label AI-generated presenters as such where the platform asks (Instagram's "AI info" label, TikTok's AI-generated content toggle), never present an avatar as a real customer or testimonial, and only use voices/likenesses you have the rights to.
