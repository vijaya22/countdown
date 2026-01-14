// Content script for saving shared countdowns to the extension

// Signal to the page that the extension is installed
// Send multiple times to handle timing issues
function signalInstalled() {
  window.postMessage({ type: "COUNTDOWN_EXT_INSTALLED" }, "*");
}

// Signal immediately and after delays to ensure page catches it
signalInstalled();
setTimeout(signalInstalled, 100);
setTimeout(signalInstalled, 500);
setTimeout(signalInstalled, 1000);

// Also respond to ping requests from the page
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;

  if (event.data?.type === "COUNTDOWN_EXT_PING") {
    signalInstalled();
    return;
  }

  if (event.data?.type !== "SAVE_COUNTDOWN") return;

  const { target } = event.data;
  if (!target) return;

  try {
    // Convert ISO string to local datetime format for storage
    const date = new Date(target);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const isoLocal = `${year}-${month}-${day}T${hours}:${minutes}`;

    // Save to chrome storage
    await chrome.storage.sync.set({ targetIsoLocal: isoLocal });

    // Notify the page of success
    window.postMessage({ type: "COUNTDOWN_SAVED", success: true }, "*");
  } catch (e) {
    window.postMessage({ type: "COUNTDOWN_SAVED", success: false }, "*");
  }
});
