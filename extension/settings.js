/* SPDX-License-Identifier: MIT */
(() => {
  "use strict";
  let enabled = true;
  const publish = () => window.dispatchEvent(new CustomEvent("still-scroll:settings:v1", {
    detail: enabled ? "on" : "off"
  }));
  window.addEventListener("still-scroll:ready:v1", publish);
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.enabled) {
      enabled = changes.enabled.newValue !== false;
      publish();
    }
  });
  browser.storage.local.get({enabled: true}).then(settings => {
    enabled = settings.enabled;
    publish();
  }).catch(() => publish());
})();
