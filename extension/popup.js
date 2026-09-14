/* SPDX-License-Identifier: MIT */
"use strict";
const checkbox = document.getElementById("enabled");
const status = document.getElementById("status");
function render(enabled) {
  checkbox.checked = enabled;
  status.textContent = enabled
    ? "On — your reading position stays under your control."
    : "Paused — ChatGPT controls automatic scrolling.";
}
browser.storage.local.get({enabled: true}).then(settings => {
  render(settings.enabled);
  checkbox.disabled = false;
}).catch(() => { status.textContent = "Could not read the setting. Reopen this popup to retry."; });
checkbox.addEventListener("change", async () => {
  const enabled = checkbox.checked;
  checkbox.disabled = true;
  try {
    await browser.storage.local.set({enabled});
    render(enabled);
  } catch {
    checkbox.checked = !enabled;
    status.textContent = "Could not save. Please try again.";
  } finally {
    checkbox.disabled = false;
  }
});
