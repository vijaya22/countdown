# Privacy Policy for Every Second Counts

**Last updated:** February 27, 2026

## Overview

Every Second Counts is a Chrome extension that replaces your new tab page with a countdown timer. It also includes optional features such as shareable countdown links and premium license activation.

We designed the extension to collect as little data as possible. Most settings are stored in Chrome storage under your browser profile.

## What Data Is Stored in the Extension

The extension stores the following data in Chrome storage:

### `chrome.storage.sync` (syncs with your signed-in Chrome profile)

- Countdown target date/time (`targetIsoLocal`)
- Countdown sound preferences (`soundEnabled`, `soundPlayedFor`)
- Theme and appearance settings (`themeId`, `customTheme`)
- Font settings (`clockFontId`, `textFontId`)
- Cached share link for the current target (`shareLink`)
- Premium license status (`license`, including key, status, validation timestamp, and expiry if applicable)

### `chrome.storage.local` (stored only on your current device)

- Background image data (`bgImage`)
- Pomodoro timer state and settings (`pomodoroState`, `pomodoroSettings`)

## Network Requests and External Services

The extension does not send your browsing history, page content, or personal files to our servers.

Network requests happen only when you use specific optional features:

### 1) Share Countdown Links

When you create a share link, the extension sends the countdown target (and title) to our Cloudflare Worker service at:

- `https://countdown.everysecondcounts.workers.dev`

The service stores shared countdown data for up to **90 days** and returns a public link. Anyone with that link can view the shared countdown.

For abuse prevention, the share service applies rate limiting and stores a temporary counter associated with request IP metadata for up to **1 hour**.

### 2) Premium License Activation and Validation

When you activate or validate a premium license, the extension sends your entered license key to our Worker endpoint:

- `POST /api/license/activate`
- `POST /api/license/validate`

The Worker validates the key with Lemon Squeezy and caches license status for up to **30 days**.

Third party involved for license verification:

- Lemon Squeezy: [https://www.lemonsqueezy.com/privacy](https://www.lemonsqueezy.com/privacy)

## Chrome Permissions Used

The extension requests only these permissions:

- `storage`: Save countdown, theme, font, license, and other settings
- `alarms`: Keep Pomodoro phase timing accurate
- `notifications`: Show Pomodoro transition/completion notifications

The extension also includes a content script on its own share domain to support “Save to Extension” from shared countdown pages.

## What We Do Not Do

- No ads
- No analytics or tracking SDKs
- No sale of personal data
- No reading of your browsing history
- No collection of the content of websites you visit

## Data Retention and Deletion

- Local/sync settings remain until you change them, clear browser data, or uninstall the extension.
- Shared countdown links expire automatically after up to 90 days.
- Rate-limit counters expire after up to 1 hour.
- Cached license validation data expires after up to 30 days.

You can remove extension-stored data by uninstalling the extension and/or clearing extension storage in Chrome.

## Changes to This Policy

We may update this policy as features evolve. The “Last updated” date will reflect the latest version.

## Contact

If you have questions, open an issue on GitHub:
[https://github.com/vijaya22/countdown](https://github.com/vijaya22/countdown)
