# Premium Features Implementation Plan

## Overview

Add premium features to "Every Second Counts" using LemonSqueezy for payments and license validation.

**Premium Feature (Phase 1):**
- Custom Themes - Premium color presets + custom color picker

**Future Premium Features (not in this phase):**
- Multiple Countdowns
- Unlimited Sharing

---

## Architecture

```
User purchases on LemonSqueezy → Gets license key → Enters in extension
    ↓
Extension calls Worker /api/license/activate
    ↓
Worker validates with LemonSqueezy API → Caches in LICENSES KV
    ↓
Extension stores license status in chrome.storage.sync
    ↓
Premium features unlocked locally
```

---

## Implementation Phases

### Phase 1: LemonSqueezy Setup (Manual - You do this)
- [ ] Create LemonSqueezy account at https://lemonsqueezy.com
- [ ] Create a "Premium" product (one-time purchase, lifetime license)
- [ ] Enable "License keys" for the product in LemonSqueezy settings
- [ ] Get API key from Settings → API (for license validation)
- [ ] Note the product checkout URL for the "Buy License" link

### Phase 2: Worker License Infrastructure
**Files:** `worker/index.js`, `worker/constants.js`, `worker/wrangler.toml`

1. Create new KV namespace `LICENSES`
2. Add `LEMON_SQUEEZY_API_KEY` as worker secret
3. Add endpoints:
   - `POST /api/license/activate` - Validate and store license
   - `POST /api/license/validate` - Check license status

### Phase 3: Extension License Management
**Files:** `newtab.js`, `newtab.html`, `styles.css`, `constants.js`

1. Add license storage functions (`getLicense`, `setLicense`, `isPremium`)
2. Add license modal UI (enter key, show errors)
3. Add upgrade banner in settings (for free users)
4. Add premium badge in settings (for premium users)
5. Implement 7-day background revalidation

### Phase 4: Custom Themes
**Files:** `newtab.js`, `newtab.html`, `styles.css`, `constants.js`

1. Add theme presets (ocean, sunset, forest, etc.)
2. Add theme picker UI in settings
3. Add custom color picker (premium only)
4. Migrate `darkMode` → `themeMode`
5. Lock premium presets behind `isPremium()` check

---

## Data Structures

### License (chrome.storage.sync)
```javascript
license: {
  key: "LS-XXXX-XXXX-XXXX-XXXX",
  status: "active",  // "active" | "expired" | "none"
  validatedAt: 1705234567890,
  expiresAt: null    // null for lifetime
}
```

### Theme (chrome.storage.sync)
```javascript
themeMode: "dark",  // "light" | "dark" | "ocean" | "sunset" | "forest" | "custom"
customTheme: {      // only when themeMode === "custom"
  bg: "#1a1a1a",
  text: "#f5f5f3",
  muted: "#888888",
  border: "#333333",
  accent: "#4a9eff"
}
```

---

## Theme Presets

| Name | Background | Text | Accent | Premium |
|------|------------|------|--------|---------|
| Light | #f5f5f3 | #1a1a1a | #1a1a1a | No |
| Dark | #1a1a1a | #f5f5f3 | #f5f5f3 | No |
| Ocean | #0f1419 | #e7e9ea | #1d9bf0 | Yes |
| Sunset | #1a1418 | #f5e6d3 | #ff6b35 | Yes |
| Forest | #0d1a0d | #e0f0e0 | #4ade80 | Yes |
| Custom | User-defined | User-defined | User-defined | Yes |

---

## New UI Components

### Settings Modal Additions
```
┌─────────────────────────────┐
│ [PREMIUM badge] Active      │  ← or "Upgrade" button for free users
├─────────────────────────────┤
│ Sound alert         [toggle]│
│ Theme                       │
│ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │Light│ │Dark │ │Ocean│🔒  │
│ └─────┘ └─────┘ └─────┘    │
│ Share countdown      [icon] │
├─────────────────────────────┤
│ ☕ Buy me a coffee          │
└─────────────────────────────┘
```

### License Modal
```
┌─────────────────────────────┐
│ Activate Premium            │
│                             │
│ Enter your license key:     │
│ ┌─────────────────────────┐ │
│ │ LS-XXXX-XXXX-XXXX-XXXX  │ │
│ └─────────────────────────┘ │
│                             │
│ [Activate]  [Buy License]   │
└─────────────────────────────┘
```

---

## API Endpoints (New)

### POST /api/license/activate
```json
Request:  { "licenseKey": "LS-XXXX-XXXX-XXXX-XXXX" }
Response: { "success": true, "status": "active", "expiresAt": null }
```

### POST /api/license/validate
```json
Request:  { "licenseKey": "LS-XXXX-XXXX-XXXX-XXXX" }
Response: { "valid": true, "status": "active" }
```

---

## Security Model

- **Lifetime license** - one-time purchase, never expires
- License validation happens server-side (Worker + LemonSqueezy)
- Local premium status cached for 7 days (offline grace period)
- Client-side feature gating for themes (acceptable for cosmetic features)
- Activation count limit (3 devices) enforced by LemonSqueezy

---

## Files to Modify

| File | Changes |
|------|---------|
| `worker/wrangler.toml` | Add LICENSES KV namespace |
| `worker/constants.js` | Add license validation constants |
| `worker/index.js` | Add license endpoints |
| `constants.js` | Add theme presets, LemonSqueezy URL |
| `newtab.js` | License management, theme functions |
| `newtab.html` | License modal, theme picker in settings |
| `styles.css` | Premium UI styles, theme picker |
| `manifest.json` | Version bump to 2.0.0 |

---

## Estimated Effort

- Phase 1 (LemonSqueezy setup): Manual setup by you
- Phase 2 (Worker license): ~100 lines
- Phase 3 (Extension license): ~150 lines
- Phase 4 (Custom themes): ~150 lines

Total: ~400 lines of new code
