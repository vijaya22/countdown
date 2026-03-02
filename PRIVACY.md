# Privacy Policy for Every Second Counts

**Last updated:** March 2, 2026

## Overview

Every Second Counts is a Chrome extension that replaces your new tab page with a live countdown timer. This policy explains what data is stored, what is transmitted, and to whom.

---

## Data Stored Locally

### Chrome Synced Storage (`chrome.storage.sync`)
The following preferences are stored and synced across your signed-in Chrome browsers (if Chrome Sync is enabled):

| Data | Purpose |
|------|---------|
| Target date/time | Your countdown target |
| Sound alert preference | Whether the completion sound is enabled |
| Theme selection | Your chosen colour theme |
| Custom theme colours | Your custom background, text, and border colours |
| Clock and text font selection | Your chosen fonts |
| Cached share link | The last generated share URL and the target it was created for |
| License key and status | Premium license key, activation status, and expiry (premium users only) |

If Chrome Sync is enabled, this data is transmitted to and stored on Google's servers per [Google's Privacy Policy](https://policies.google.com/privacy).

### Device-Local Storage (`chrome.storage.local`)
The following data is stored only on your device and is never synced:

| Data | Purpose |
|------|---------|
| Background image | Your uploaded background photo (stored as a compressed JPEG, max 1920px) |
| Pomodoro timer state | Current phase, remaining time, and session count |
| Pomodoro settings | Focus and break durations, interval count |
| Analytics device ID | A randomly generated UUID used to distinguish devices in analytics (see below) |

---

## Data Transmitted to External Servers

### 1. Usage Analytics
**When:** On every key interaction (e.g. opening settings, setting a countdown, changing a theme).
**What is sent:** An event name, a random device ID (UUID), a timestamp, and event-specific properties such as `days_until_target`, `theme_id`, or `font_id`. No personal information is included.
**Route:** Extension → your Cloudflare Worker → Amplitude Analytics
**Why proxied:** The Amplitude API key is stored as a Cloudflare secret and never included in the extension code.

Events tracked include: extension install/update, countdown set and completed, settings opened, sound toggled, theme and font changes, background image set/removed, share link created/copied, upgrade button clicked, license activation success/failure, and all Pomodoro timer interactions.

### 2. License Validation (Premium Users Only)
**When:** When you activate a license key, and once every 7 days thereafter to confirm it remains valid.
**What is sent:** Your license key.
**Route:** Extension → your Cloudflare Worker → LemonSqueezy
**Stored:** Cloudflare caches the validation result for a period to reduce API calls. The license key and status are also stored locally (see above).

### 3. Countdown Sharing (Optional)
**When:** Only if you click the Share button.
**What is sent:** Your countdown target date/time and the title "Every Second Counts".
**Route:** Extension → your Cloudflare Worker → Cloudflare KV store
**Stored:** Countdown data is stored on Cloudflare for 90 days, accessible via a unique share URL.

---

## Third-Party Services

| Service | Purpose | Privacy Policy |
|---------|---------|----------------|
| **Amplitude** | Usage analytics | [amplitude.com/privacy](https://amplitude.com/privacy) |
| **LemonSqueezy** | License validation (premium users only) | [lemonsqueezy.com/privacy](https://www.lemonsqueezy.com/privacy) |
| **Cloudflare** | Backend infrastructure (analytics proxy, licensing, sharing) | [cloudflare.com/privacypolicy](https://www.cloudflare.com/privacypolicy/) |
| **Google** | Chrome Sync (if enabled by you in Chrome) | [policies.google.com/privacy](https://policies.google.com/privacy) |

---

## Permissions

| Permission | Why it's needed |
|-----------|----------------|
| `storage` | Save your preferences and timer state locally |
| `alarms` | Trigger Pomodoro phase transitions when the timer expires |
| `notifications` | Show a system notification when a Pomodoro phase ends |
| New Tab Override | Replace the default new tab page with the countdown |

The extension also runs a content script on `https://countdown.everysecondcounts.workers.dev/*` to allow saving a shared countdown directly to the extension from the sharing page.

---

## What We Do Not Collect

- No names, email addresses, or account information
- No browsing history or URLs visited
- No location data
- No microphone or camera access
- Background images are processed entirely on your device and never uploaded to any server

---

## Data Retention

| Data | Retention |
|------|-----------|
| Local preferences and timer state | Until you uninstall the extension or clear extension storage |
| Background image | Until you remove it or uninstall the extension |
| Analytics device ID | Until you uninstall the extension or clear extension storage |
| Share link data (Cloudflare) | 90 days |
| Analytics events (Amplitude) | Per Amplitude's data retention policy |
| License validation cache (Cloudflare) | Up to 24 hours |

---

## Your Choices

- **Analytics:** The device ID is a random UUID with no connection to your identity. There is currently no opt-out mechanism in the extension UI.
- **Chrome Sync:** You can disable Chrome Sync in Chrome settings to prevent your preferences from being sent to Google.
- **Sharing:** Share link creation is entirely optional and only occurs when you click the Share button.
- **Premium features:** License validation is only triggered if you have entered a license key.

---

## Contact

If you have questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/vijaya22/countdown).
