/**
 * Amplitude analytics via HTTP API v2.
 * Works in both extension pages (newtab) and the background service worker.
 */

const ANALYTICS_ENDPOINT = "https://countdown.everysecondcounts.workers.dev/api/analytics";
const AMPLITUDE_DEVICE_ID_KEY = "amplitudeDeviceId";

function _generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function _getDeviceId() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [AMPLITUDE_DEVICE_ID_KEY]: null }, (result) => {
      if (result[AMPLITUDE_DEVICE_ID_KEY]) {
        resolve(result[AMPLITUDE_DEVICE_ID_KEY]);
        return;
      }
      const newId = _generateUUID();
      chrome.storage.local.set({ [AMPLITUDE_DEVICE_ID_KEY]: newId }, () => {
        resolve(newId);
      });
    });
  });
}

async function track(eventType, eventProperties = {}) {
  try {
    const deviceId = await _getDeviceId();
    fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: [
          {
            event_type: eventType,
            device_id: deviceId,
            time: Date.now(),
            platform: "Chrome Extension",
            event_properties: eventProperties
          }
        ]
      })
    }).catch(() => {});
  } catch (e) {
    // Silently ignore — analytics must never break the extension
  }
}
