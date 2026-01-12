// Generate a short random ID
function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// Landing page HTML
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
    }
    .cta a {
      color: var(--muted);
      font-size: 12px;
      text-decoration: none;
    }
    .cta a:hover {
      color: var(--text);
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
      <a href="https://chromewebstore.google.com/detail/every-second-counts/dbpmgoghpheaeldmfgifedhjbdookjbo" target="_blank">
        Get the Chrome extension
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
  </script>
</body>
</html>`;
}

// 404 page
function notFound() {
  return new Response('Countdown not found', { status: 404 });
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
        await env.COUNTDOWNS.put(id, JSON.stringify(data), { expirationTtl: 90 * 24 * 60 * 60 });

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
