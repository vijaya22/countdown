/**
 * Amplitude analytics via HTTP API v2.
 * Works in both extension pages (newtab) and the background service worker.
 */

const AMPLITUDE_API_KEY = "2e9817901609f403a1dac286d11d748d";
const AMPLITUDE_ENDPOINT = "https://api2.amplitude.com/2/httpapi";
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
    fetch(AMPLITUDE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: AMPLITUDE_API_KEY,
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
