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
  let navigationExpiresAt = 0;
  let quoteNavigation = null;
  const MODERN_ROOT = '.thread-scroll-container[data-app-action-timeline-scroll]';
  const USER_MESSAGE = '[data-message-author-role="user"][data-message-id], [data-chatgpt-search-unit-key$=":user"][data-chatgpt-search-message-ids]';
  const ASSISTANT_MESSAGE = '[data-message-author-role="assistant"][data-message-id], [data-chatgpt-search-unit-key$=":assistant"][data-chatgpt-search-message-ids]';

  const normalizeQuote = text => (text || "").replace(/[\s\u200B-\u200D\u2060\uFEFF]+/gu, "").normalize("NFC");

  function allowPromptNavigation(element, options) {
    if (!navigationExpiresAt || performance.now() > navigationExpiresAt) {
      navigationExpiresAt = 0;
      quoteNavigation = null;
      return false;
    }
    if (quoteNavigation) {
      const {message, text, sourceTurn} = quoteNavigation;
      if (options?.block !== "nearest") return false;
      // A virtualized answer is initially only an empty height placeholder.
      // Allow one earlier placeholder to mount, then restrict the final jump
      // to that exact turn. The clicked user message can itself unmount meanwhile.
      if (!sourceTurn && element.matches('[data-turn-id-container][data-is-intersecting="false"]') &&
          !element.textContent.trim() && root()?.contains(element) && message.isConnected &&
          (element.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        quoteNavigation.sourceTurn = element.getAttribute("data-turn-id-container");
        return true;
      }
      const source = element.closest(ASSISTANT_MESSAGE);
      if (!source) return false;
      if (sourceTurn) {
        if (source.closest("[data-turn-id-container]")?.getAttribute("data-turn-id-container") !== sourceTurn) return false;
      } else if (!message.isConnected ||
          !(source.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
      if (![element.textContent, element.innerText].some(value => normalizeQuote(value).includes(text))) return false;
    } else if (options?.block !== "start" ||
        !element.matches(USER_MESSAGE)) return false;
    navigationExpiresAt = 0;
    quoteNavigation = null;
    return true;
  }

  // Keep originals private. The bottom button uses these directly; a click
  // never opens a time window in which unrelated automatic scrolls can escape.
  const nativeScrollTo = Element.prototype.scrollTo;
  const nativeFocus = HTMLElement.prototype.focus;
  let readingAnchor = null;

  // Keep the site's native coordinate system. Its virtualizer interprets
  // negative scrollTop values; changing column-reverse to column makes it
  // mount the wrong messages (or no messages at all).
  function syncReadingAnchor(viewport) {
    if (!enabled || !viewport?.matches(MODERN_ROOT) ||
        getComputedStyle(viewport).flexDirection !== "column-reverse") {
      readingAnchor = null;
      return;
    }
    const previous = readingAnchor;
    if (previous?.viewport === viewport && previous.element.isConnected &&
        viewport.contains(previous.element)) {
      // Account for native/manual movement since the last observation. Only
      // compensate displacement caused by layout, not a wheel/keyboard scroll.
      const displacement = previous.element.getBoundingClientRect().top - previous.y +
        viewport.scrollTop - previous.top;
      if (Math.abs(displacement) > 0.75) {
        Reflect.apply(nativeScrollTo, viewport, [{
          top: viewport.scrollTop + displacement,
          left: viewport.scrollLeft, behavior: "instant"
        }]);
      }
    }
    const bounds = viewport.getBoundingClientRect();
    let element = null;
    for (const fraction of [0.4, 0.25, 0.6]) {
      const hit = document.elementFromPoint(
        Math.max(0, Math.min(innerWidth - 1, bounds.left + bounds.width / 2)),
        Math.max(0, Math.min(innerHeight - 1, bounds.top + bounds.height * fraction))
      );
      const candidate = hit?.closest('p, h1, h2, h3, h4, pre, li, table, [data-user-message-bubble]');
      if (candidate && viewport.contains(candidate) &&
          !candidate.closest('[data-thread-scroll-footer], [contenteditable="true"]')) {
        element = candidate;
        break;
      }
    }
    element ||= viewport.firstElementChild;
    readingAnchor = element ? {viewport, element,
      top: viewport.scrollTop, y: element.getBoundingClientRect().top} : null;
  }

  function root() {
    if (cachedRoot?.isConnected) return cachedRoot;
    cachedRoot = document.querySelector(`[data-scroll-root], ${MODERN_ROOT}`);
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

  // ChatGPT can optimistically clear its away-from-bottom flag when starting
  // a reply, even when our guard prevents the corresponding scroll. Its native
  // arrow/streaming-dots button then becomes invisible. Keep this presentation
  // flag consistent with geometry; never move the viewport to repair the flag.
  let visibilityFrame = 0;
  let observedViewport = null;
  let observedContent = null;
  const buttonRepairs = new Map();

  function restoreButtons() {
    for (const [button, saved] of buttonRepairs) {
      for (const [name, value, priority] of saved.styles) {
        if (value) button.style.setProperty(name, value, priority);
        else button.style.removeProperty(name);
      }
      for (const [name, value] of saved.attributes) {
        if (value === null) button.removeAttribute(name);
        else button.setAttribute(name, value);
      }
    }
    buttonRepairs.clear();
  }

  function modernBottomButton(viewport) {
    return viewport?.querySelector('[data-thread-scroll-footer] button[aria-label="Scroll to bottom"]');
  }
  const resizeObserver = new ResizeObserver(scheduleBottomVisibility);
  function scheduleBottomVisibility() {
    if (!enabled || visibilityFrame) return;
    visibilityFrame = requestAnimationFrame(syncBottomVisibility);
  }
  function syncBottomVisibility() {
    visibilityFrame = 0;
    if (!enabled) return;
    const viewport = root();
    syncReadingAnchor(viewport);
    const content = viewport?.matches(MODERN_ROOT) ? viewport.firstElementChild : null;
    if (viewport !== observedViewport || content !== observedContent) {
      resizeObserver.disconnect();
      observedViewport = viewport;
      observedContent = content;
      if (viewport) resizeObserver.observe(viewport);
      if (content) resizeObserver.observe(content);
    }
    if (!viewport) return;
    const reverse = getComputedStyle(viewport).flexDirection === "column-reverse";
    const away = (reverse ? -viewport.scrollTop : viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop) > 48;
    if (viewport.hasAttribute("data-scroll-root") && viewport.hasAttribute("data-scroll-from-end") !== away) {
      viewport.toggleAttribute("data-scroll-from-end", away);
    }
    const button = modernBottomButton(viewport);
    if (!away || !button || [...buttonRepairs.keys()].some(saved => saved !== button)) restoreButtons();
    if (away && button) {
      if (!buttonRepairs.has(button)) buttonRepairs.set(button, {
        styles: ["opacity", "pointer-events"].map(name =>
          [name, button.style.getPropertyValue(name), button.style.getPropertyPriority(name)]),
        attributes: ["aria-hidden", "tabindex"].map(name => [name, button.getAttribute(name)])
      });
      button.style.setProperty("opacity", "1", "important");
      button.style.setProperty("pointer-events", "auto", "important");
      if (button.getAttribute("aria-hidden") !== "false") button.setAttribute("aria-hidden", "false");
      if (button.getAttribute("tabindex") !== "0") button.setAttribute("tabindex", "0");
    }
  }
  const visibilityObserver = new MutationObserver(scheduleBottomVisibility);
  visibilityObserver.observe(document, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ["data-scroll-from-end", "data-scroll-root", "data-app-action-timeline-scroll", "aria-hidden", "tabindex"]
  });
  window.addEventListener("scroll", event => {
    const viewport = root();
    if (event.target === viewport) syncReadingAnchor(viewport);
    scheduleBottomVisibility();
  }, {capture: true, passive: true});
  window.addEventListener("resize", scheduleBottomVisibility, {passive: true});
  // Image/resource layout changes need not mutate DOM text or viewport size.
  document.addEventListener("load", scheduleBottomVisibility, true);
  scheduleBottomVisibility();

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
        if (enabled && affectsConversation(this) &&
            !(name === "scrollIntoView" && allowPromptNavigation(this, args[0]))) return undefined;
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
    if (button === modernBottomButton(root())) return true;

    // The current button has aria-hidden=true and no accessible name. Identify
    // its dedicated footer wrapper, never the arrow-shaped Send button.
    if (button.closest('#thread-bottom-container [style*="--thread-scroll-to-bottom-banner-offset"]')) {
      return button.getAttribute("aria-hidden") === "true" &&
        button.getAttribute("tabindex") === "-1";
    }

    // Older layouts expose a name. Constrain these fallbacks to the footer or
    // outside messages so similarly named buttons in answers aren't captured.
    if (button.closest(`[data-testid^="conversation-turn-"], article[data-turn-id], ${USER_MESSAGE}, ${ASSISTANT_MESSAGE}`)) return false;
    const label = button.getAttribute("aria-label") || button.getAttribute("title") || "";
    return /^(scroll to bottom|scroll to the bottom|scroll down|jump to bottom)$/i.test(label);
  }

  function isPromptNavigationButton(button) {
    if (!button || button.disabled || !root()) return false;
    if (button.closest(`[data-testid^="conversation-turn-"], [data-turn-id], [data-message-author-role], ${USER_MESSAGE}, ${ASSISTANT_MESSAGE}`)) return false;
    if (button.hasAttribute("data-toc-item-index")) {
      return /^\d+$/.test(button.getAttribute("data-toc-item-index"));
    }
    // Expanded prompt labels have no index themselves. The popover shares a
    // parent with the compact, indexed rail. Do not match ordinary site menus.
    const popover = button.closest('.popover[aria-hidden="false"]');
    return button.classList.contains("__menu-item") &&
      !!popover?.parentElement.closest(".fixed") &&
      !!popover?.parentElement.querySelector("button[data-toc-item-index]");
  }

  function quotedReply(button) {
    if (!button || button.disabled || !root()?.contains(button)) return null;
    const message = button.parentElement;
    // The submitted quote is a direct button child of the user message. The
    // composer quote and message-action buttons must not grant navigation.
    if (!message?.matches('[data-message-author-role="user"][data-message-id]') ||
        button.type !== "button" || !button.querySelector(":scope > p.line-clamp-3") ||
        !button.querySelector(':scope > span[aria-hidden="true"] svg')) return null;
    const text = normalizeQuote(button.querySelector(":scope > p.line-clamp-3").textContent);
    return text ? {message, text} : null;
  }

  // A pending navigation may wait briefly for ChatGPT to mount its target.
  // Another manual gesture cancels it before it can affect later reading.
  for (const name of ["pointerdown", "wheel", "touchstart", "keydown"]) {
    window.addEventListener(name, event => {
      if (event.isTrusted) { navigationExpiresAt = 0; quoteNavigation = null; }
    }, {capture: true, passive: true});
  }

  window.addEventListener("click", event => {
    navigationExpiresAt = 0;
    quoteNavigation = null;
    if (!enabled || !event.isTrusted || event.button !== 0) return;
    const button = event.composedPath().find(node => node instanceof HTMLButtonElement);
    quoteNavigation = quotedReply(button);
    if (quoteNavigation || isPromptNavigationButton(button)) {
      navigationExpiresAt = performance.now() + 1000;
      return; // Let ChatGPT choose and render the selected prompt itself.
    }
    if (!isBottomButton(button)) return;
    const viewport = root();
    event.preventDefault();
    event.stopImmediatePropagation();
    Reflect.apply(nativeScrollTo, viewport, [{
      top: getComputedStyle(viewport).flexDirection === "column-reverse" ? 0 : viewport.scrollHeight,
      left: viewport.scrollLeft,
      behavior: "instant"
    }]);
  }, true);

  // A single boolean crosses from the extension's isolated world. Page code
  // could spoof it, but this channel grants no extension API access and never
  // reads, stores, or transmits conversation text.
  window.addEventListener(SETTINGS_EVENT, event => {
    navigationExpiresAt = 0;
    quoteNavigation = null;
    if (event.detail === "on") enabled = true;
    if (event.detail === "off") enabled = false;
    readingAnchor = null;
    if (!enabled) restoreButtons();
    scheduleBottomVisibility();
  });
  window.dispatchEvent(new Event(READY_EVENT));
})();
