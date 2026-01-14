import {
  RATE_LIMIT,
  RATE_WINDOW_SECONDS,
  COUNTDOWN_TTL_SECONDS,
  ID_LENGTH,
  ID_CHARS,
  CHROME_STORE_URL
} from './constants.js';

// Generate a short random ID
function generateId() {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return id;
}

// Landing page HTML of the shared user
function renderPage(countdown) {
  const { target, title } = countdown;
  const pageTitle = title || 'Every Second Counts';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <style>
    :root {
      --bg: #f5f5f3;
      --text: #1a1a1a;
      --muted: #888;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .container {
      text-align: center;
    }
    .title {
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .timer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .time {
      font-size: clamp(48px, 12vw, 100px);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .sep {
      font-size: clamp(40px, 10vw, 80px);
      color: var(--muted);
    }
    .target {
      margin-top: 24px;
      font-size: 13px;
      color: var(--muted);
    }
    .status {
      margin-top: 12px;
      font-size: 14px;
    }
    .cta {
      margin-top: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .get-ext {
      display: inline-block;
      padding: 12px 24px;
      border: 2px solid var(--text);
      border-radius: 8px;
      color: var(--text);
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .get-ext:hover {
      background: var(--text);
      color: var(--bg);
    }
    .save-btn {
      display: none;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      background: var(--text);
      color: var(--bg);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .save-btn:hover {
      opacity: 0.85;
    }
    .save-btn.visible {
      display: block;
    }
    .save-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .get-ext.hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">${pageTitle}</div>
    <div class="timer">
      <span class="time" id="hh">00</span>
      <span class="sep">:</span>
      <span class="time" id="mm">00</span>
      <span class="sep">:</span>
      <span class="time" id="ss">00</span>
    </div>
    <div class="target" id="target"></div>
    <div class="status" id="status"></div>
    <div class="cta">
      <button id="saveBtn" class="save-btn">Save to Extension</button>
      <a id="getExt" class="get-ext" href="${CHROME_STORE_URL}" target="_blank">
        Get Extension to Save This Countdown
      </a>
    </div>
  </div>
  <script>
    const target = new Date("${target}");
    const hh = document.getElementById("hh");
    const mm = document.getElementById("mm");
    const ss = document.getElementById("ss");
    const targetEl = document.getElementById("target");
    const statusEl = document.getElementById("status");

    targetEl.textContent = "Target: " + target.toLocaleString();

    function pad(n) { return String(n).padStart(2, "0"); }

    function update() {
      const now = new Date();
      const diff = target - now;

      if (diff <= 0) {
        hh.textContent = "00";
        mm.textContent = "00";
        ss.textContent = "00";
        statusEl.textContent = "Time's up!";
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      hh.textContent = pad(hours);
      mm.textContent = pad(mins);
      ss.textContent = pad(secs);
    }

    update();
    setInterval(update, 250);

    // Extension integration
    const saveBtn = document.getElementById("saveBtn");
    const getExt = document.getElementById("getExt");

    // Listen for extension installed signal
    window.addEventListener("message", (e) => {
      if (e.data?.type === "COUNTDOWN_EXT_INSTALLED") {
        saveBtn.classList.add("visible");
        getExt.classList.add("hidden");
      }
      if (e.data?.type === "COUNTDOWN_SAVED") {
        if (e.data.success) {
          saveBtn.textContent = "Saved!";
          saveBtn.disabled = true;
        } else {
          saveBtn.textContent = "Failed";
          setTimeout(() => {
            saveBtn.textContent = "Save to Extension";
            saveBtn.disabled = false;
          }, 2000);
        }
      }
    });

    // Save button click
    saveBtn.addEventListener("click", () => {
      saveBtn.textContent = "Saving...";
      saveBtn.disabled = true;
      window.postMessage({ type: "SAVE_COUNTDOWN", target: "${target}" }, "*");
    });

    // Ping extension to check if installed
    window.postMessage({ type: "COUNTDOWN_EXT_PING" }, "*");
  </script>
</body>
</html>`;
}

// 404 page
function notFound() {
  return new Response('Countdown not found', { status: 404 });
}

// Check rate limit for an IP
async function checkRateLimit(ip, env) {
  const key = `ratelimit:${ip}`;
  const current = await env.COUNTDOWNS.get(key);

  if (current) {
    const count = parseInt(current, 10);
    if (count >= RATE_LIMIT) {
      return { allowed: false, remaining: 0 };
    }
    await env.COUNTDOWNS.put(key, String(count + 1), { expirationTtl: RATE_WINDOW_SECONDS });
    return { allowed: true, remaining: RATE_LIMIT - count - 1 };
  }

  await env.COUNTDOWNS.put(key, '1', { expirationTtl: RATE_WINDOW_SECONDS });
  return { allowed: true, remaining: RATE_LIMIT - 1 };
}

// Get client IP from request
function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         'unknown';
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API: Create new countdown
    if (path === '/api/create' && request.method === 'POST') {
      try {
        // Check rate limit
        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, env);

        if (!rateLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfterSeconds: RATE_WINDOW_SECONDS,
            retryAfterMinutes: Math.ceil(RATE_WINDOW_SECONDS / 60)
          }), {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(RATE_WINDOW_SECONDS),
            },
          });
        }

        const { target, title } = await request.json();

        if (!target) {
          return new Response(JSON.stringify({ error: 'target is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const id = generateId();
        const data = { target, title: title || null, created: Date.now() };

        // Store for 90 days
        await env.COUNTDOWNS.put(id, JSON.stringify(data), { expirationTtl: COUNTDOWN_TTL_SECONDS });

        const shareUrl = `${url.origin}/c/${id}`;

        return new Response(JSON.stringify({ id, url: shareUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // API: Get countdown data (JSON)
    if (path.startsWith('/api/get/')) {
      const id = path.replace('/api/get/', '');
      const data = await env.COUNTDOWNS.get(id);

      if (!data) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(data, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Page: View countdown
    if (path.startsWith('/c/')) {
      const id = path.replace('/c/', '');
      const data = await env.COUNTDOWNS.get(id);

      if (!data) {
        return notFound();
      }

      const countdown = JSON.parse(data);
      const html = renderPage(countdown);

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Home page
    if (path === '/') {
      return new Response('Every Second Counts - Shareable Countdowns', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return notFound();
  },
};
