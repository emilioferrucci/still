/* SPDX-License-Identifier: MIT
 * Runs before ChatGPT in the page world: an isolated-world override cannot
 * intercept the functions called by the site's JavaScript.
 */
(() => {
  "use strict";

  const SETTINGS_EVENT = "still-scroll:settings:v1";
  const READY_EVENT = "still-scroll:ready:v1";
  const INSTALL_KEY = Symbol.for("still-scroll:installed:v1");
  // Reloading/updating an extension must not save an older blocking wrapper as
  // the supposedly native function used by the manual bottom button. A page
  // reload installs new code; settings from a renewed isolated script can
  // still reach the existing instance in the meantime.
  if (window[INSTALL_KEY]) {
    window.dispatchEvent(new Event(READY_EVENT));
    return;
  }
  Object.defineProperty(window, INSTALL_KEY, {value: true, configurable: true});
  let enabled = true;
  let cachedRoot = null;

  // Keep originals private. The bottom button uses these directly; a click
  // never opens a time window in which unrelated automatic scrolls can escape.
  const nativeScrollTo = Element.prototype.scrollTo;
  const nativeFocus = HTMLElement.prototype.focus;

  function root() {
    if (cachedRoot?.isConnected) return cachedRoot;
    cachedRoot = document.querySelector("[data-scroll-root]");
    if (cachedRoot) return cachedRoot;

    // Older ChatGPT layouts: find the scrollable ancestor of an actual turn,
    // not the sidebar, the composer, a code block, or an unrelated dialog.
    let node = document.querySelector(
      '[data-testid^="conversation-turn-"], article[data-turn-id]'
    );
    for (node = node?.parentElement; node; node = node.parentElement) {
      if (/^(auto|scroll)$/.test(getComputedStyle(node).overflowY)) {
        cachedRoot = node;
        return node;
      }
    }
    return null;
  }

  function isViewport(element) {
    const viewport = root();
    return viewport !== null && (
      element === viewport || element === document.scrollingElement
    );
  }

  function affectsConversation(element) {
    const viewport = root();
    return viewport !== null && element instanceof Element && (
      viewport.contains(element) || element.contains(viewport)
    );
  }

  // Do not cancel wheel, touch, keyboard, selection, or scroll events. Native
  // browser scrolling does not call these JavaScript prototype methods.
  for (const name of ["scroll", "scrollTo", "scrollBy"]) {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, name);
    if (!descriptor?.value) continue;
    const original = descriptor.value;
    Object.defineProperty(Element.prototype, name, {
      ...descriptor,
      value: function (...args) {
        if (enabled && isViewport(this)) return undefined;
        return Reflect.apply(original, this, args);
      }
    });
  }

  for (const name of ["scrollIntoView", "scrollIntoViewIfNeeded"]) {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, name);
    if (!descriptor?.value) continue;
    const original = descriptor.value;
    Object.defineProperty(Element.prototype, name, {
      ...descriptor,
      value: function (...args) {
        if (enabled && affectsConversation(this)) return undefined;
        return Reflect.apply(original, this, args);
      }
    });
  }

  const topDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop");
  if (topDescriptor?.set) {
    Object.defineProperty(Element.prototype, "scrollTop", {
      ...topDescriptor,
      set(value) {
        if (enabled && isViewport(this)) return;
        Reflect.apply(topDescriptor.set, this, [value]);
      }
    });
  }

  for (const name of ["scroll", "scrollTo", "scrollBy"]) {
    const original = window[name];
    if (typeof original !== "function") continue;
    window[name] = function (...args) {
      if (enabled && root()) return undefined;
      return Reflect.apply(original, this, args);
    };
  }

  const focusDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "focus");
  Object.defineProperty(HTMLElement.prototype, "focus", {
    ...focusDescriptor,
    value: function (options) {
      if (enabled && affectsConversation(this)) {
        return Reflect.apply(nativeFocus, this, [{...options, preventScroll: true}]);
      }
      return Reflect.apply(nativeFocus, this, arguments);
    }
  });

  function isBottomButton(button) {
    if (!button || button.disabled || !root()?.contains(button)) return false;

    // The current button has aria-hidden=true and no accessible name. Identify
    // its dedicated footer wrapper, never the arrow-shaped Send button.
    if (button.closest('#thread-bottom-container [style*="--thread-scroll-to-bottom-banner-offset"]')) {
      return button.getAttribute("aria-hidden") === "true" &&
        button.getAttribute("tabindex") === "-1";
    }

    // Older layouts expose a name. Constrain these fallbacks to the footer or
    // outside messages so similarly named buttons in answers aren't captured.
    if (button.closest('[data-testid^="conversation-turn-"], article[data-turn-id]')) return false;
    const label = button.getAttribute("aria-label") || button.getAttribute("title") || "";
    return /^(scroll to bottom|scroll to the bottom|scroll down|jump to bottom)$/i.test(label);
  }

  window.addEventListener("click", event => {
    if (!enabled || !event.isTrusted || event.button !== 0) return;
    const button = event.composedPath().find(node => node instanceof HTMLButtonElement);
    if (!isBottomButton(button)) return;
    const viewport = root();
    event.preventDefault();
    event.stopImmediatePropagation();
    Reflect.apply(nativeScrollTo, viewport, [{
      top: viewport.scrollHeight,
      left: viewport.scrollLeft,
      behavior: "instant"
    }]);
  }, true);

  // A single boolean crosses from the extension's isolated world. Page code
  // could spoof it, but this channel grants no extension API access and never
  // reads, stores, or transmits conversation text.
  window.addEventListener(SETTINGS_EVENT, event => {
    if (event.detail === "on") enabled = true;
    if (event.detail === "off") enabled = false;
  });
  window.dispatchEvent(new Event(READY_EVENT));
})();
