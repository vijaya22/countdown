# Every Second Counts

A minimal Chrome extension that replaces your new tab page with a live countdown timer.

**[Install from Chrome Web Store](https://chromewebstore.google.com/detail/every-second-counts/dbpmgoghpheaeldmfgifedhjbdookjbo)**

---

## Features

### Free
- **Countdown timer** — large HH:MM:SS display counting down to any target date and time
- **Counts up after completion** — shows elapsed time once the target passes, with a "Time's up!" indicator
- **Sound alert** — optional two-beep audio alert when the countdown completes
- **Share links** — generate a shareable countdown link anyone can view in their browser
- **Two themes** — Light and Dark
- **Synced across devices** — target date and preferences sync with your Chrome account

### Premium
- **Pomodoro timer** — configurable focus/break cycles with auto-phase transitions, browser notifications, and in-app toasts
- **Four extra themes** — Ocean, Sunset, Forest, and Custom
- **Custom colour picker** — set your own background, text, muted, and border colours
- **15 fonts** — separate font pickers for the clock and UI text
- **Background image** — upload and crop a photo as your new tab background

---

## Themes

| Theme | Free / Premium |
|-------|---------------|
| Light | Free |
| Dark | Free |
| Ocean | Premium |
| Sunset | Premium |
| Forest | Premium |
| Custom | Premium |

---

## Pomodoro Timer

Accessible from the drawer in the top-right corner (premium only).

| Setting | Default | Range |
|---------|---------|-------|
| Focus duration | 25 min | 1–180 min |
| Short break | 5 min | 1–60 min |
| Long break | 15 min | 1–120 min |
| Long break every | 4 sessions | 2–12 |
| Run for | 4 intervals | 1–30 |

The timer runs in the background between tabs, sends a browser notification on each phase transition, and plays an optional sound alert.

---

## Installation

### Chrome Web Store
[Install directly](https://chromewebstore.google.com/detail/every-second-counts/dbpmgoghpheaeldmfgifedhjbdookjbo) — no setup required.

### Load Unpacked (Development)
1. Clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project folder

---

## Usage

- Open a new tab to see the countdown
- Click the target date text to change it
- Click the **gear icon** to open settings (themes, fonts, sound, background image, sharing)
- Click the **arrow button** (top-right) to open the Pomodoro drawer (premium)
- Press **Escape** to close any open modal or drawer

---

## Premium

Premium unlocks the Pomodoro timer, all themes, all fonts, custom colours, and background images.

[**Get a license →**](https://everysecondcounts.lemonsqueezy.com/checkout/buy/9f98a788-97b6-41fb-bd90-4a1984fb02d7)

Enter your license key in **Settings → Activate License**. Your license is validated against the LemonSqueezy API and re-checked every 7 days.

---

## Tech Stack

**Extension**
- Vanilla JavaScript, HTML, CSS — no frameworks
- Chrome Extension Manifest V3
- Web Audio API (sound), Canvas API (image processing), Cropper.js (image crop)

**Backend** (Cloudflare Worker)
- `POST /api/create` — generates shareable countdown links (stored 90 days in Cloudflare KV)
- `POST /api/license/activate` — validates license keys via LemonSqueezy
- `POST /api/license/validate` — periodic revalidation
- `POST /api/analytics` — proxies usage events to Amplitude (API key stored as a Cloudflare secret)
- `GET /c/:id` — renders the shared countdown landing page

**Analytics**
- Amplitude, routed through the Cloudflare Worker proxy so the API key is never in the extension bundle

---

## Project Structure

```
├── manifest.json       # Extension config (MV3)
├── newtab.html         # New tab page
├── newtab.js           # Main app logic
├── background.js       # Service worker (Pomodoro state, alarms)
├── constants.js        # Themes, fonts, analytics event names
├── analytics.js        # Amplitude event tracking
├── content.js          # Content script for share page integration
├── styles.css          # All styling
├── lib/                # Bundled third-party libraries (Cropper.js)
├── assets/             # Extension icons
└── worker/             # Cloudflare Worker backend
    ├── index.js
    ├── constants.js
    └── wrangler.toml
```

---

## Deploying the Worker

```bash
cd worker
wrangler secret put AMPLITUDE_API_KEY
wrangler secret put LEMON_SQUEEZY_API_KEY
wrangler deploy
```

---

## Publishing

Releases are published automatically to the Chrome Web Store via GitHub Actions when a version tag is pushed:

```bash
git tag v2.0.3
git push origin v2.0.3
```

The workflow zips the extension, uploads it via the Chrome Web Store API, and publishes it.

---

## Privacy

Usage analytics (event names, random device ID, timestamps) are collected via Amplitude. No personal information is collected. See [PRIVACY.md](PRIVACY.md) for full details.

---

## License

[MIT](LICENSE)
