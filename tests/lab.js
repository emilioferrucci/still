/* SPDX-License-Identifier: MIT. Browser tests, not shipped in the extension. */
"use strict";
const viewport = document.querySelector("[data-scroll-root]");
const turns = document.getElementById("turns");
const result = document.getElementById("results");
const nativeTo = Element.prototype.scrollTo;
const nativeTop = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop");
const nativeIntoView = Element.prototype.scrollIntoView;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForPosition(element, top) {
  const deadline = performance.now() + 2500;
  while (Math.abs(element.scrollTop - top) >= 1 && performance.now() < deadline) await wait(50);
  if (Math.abs(element.scrollTop - top) >= 1) {
    throw new Error(`Native scroll did not settle at ${top}; actual ${element.scrollTop}`);
  }
}
let nativeButtonCalls = 0;
let runs = 0;
function position(top) { nativeTo.call(viewport, {top, behavior: "instant"}); }
function on(enabled) {
  window.dispatchEvent(new CustomEvent("still-scroll:settings:v1", {detail: enabled ? "on" : "off"}));
}
for (let i = 1; i <= 120; i++) {
  const section = document.createElement("section");
  section.dataset.testid = `conversation-turn-${i}`;
  section.innerHTML = `<h2>Section ${i}</h2><p>${"A long paragraph keeps this reading landmark easy to recognize. ".repeat(18)}</p>`;
  turns.append(section);
}
const nested = document.createElement("div");
nested.className = "nested";
nested.innerHTML = "<div>Nested code panel — independent horizontal and vertical scrolling</div>";
turns.children[39].append(nested);
const last = turns.lastElementChild;
const navTarget = turns.children[80].querySelector("h2");
navTarget.dataset.messageAuthorRole = "user";
navTarget.dataset.messageId = "local-fixture-prompt";
const quoteSource = turns.children[9];
quoteSource.dataset.messageAuthorRole = "assistant";
quoteSource.dataset.messageId = "fixture-source";
const quoteTarget = quoteSource.querySelector("p");
quoteTarget.textContent = "The blue moon rises above the fictional island. " + quoteTarget.textContent;
const quoteMessage = document.createElement("div");
quoteMessage.dataset.messageAuthorRole = "user";
quoteMessage.dataset.messageId = "fixture-quoted-reply";
for (const [id, label] of [["quote-now", "Quote now"], ["quote-delay", "Quote after 250ms"], ["quote-expired", "Quote after 1200ms"]]) {
  const b = document.createElement("button");
  b.type = "button"; b.id = id; b.title = label;
  b.innerHTML = '<span aria-hidden="true"><svg></svg></span><p class="line-clamp-3">The blue moon rises above the fictional island.</p>';
  quoteMessage.append(b);
}
document.getElementById("thread-bottom-container").prepend(quoteMessage);
const initialTop = () => turns.children[39].offsetTop - viewport.offsetTop;
const log = line => {
  const row = document.createElement("div");
  row.textContent = line;
  result.append(row);
  result.scrollTop = result.scrollHeight;
};
async function unchanged(label, action, delay = 50) {
  position(initialTop());
  await wait(30);
  const before = viewport.scrollTop;
  await action();
  await wait(delay);
  const after = viewport.scrollTop;
  const pass = Math.abs(before - after) < 1;
  log(`${pass ? "PASS" : "FAIL"} ${label}: ${before.toFixed(1)} → ${after.toFixed(1)}`);
  return pass;
}
async function run() {
  document.getElementById("run").disabled = true;
  result.textContent = `Run ${++runs}; ${navigator.userAgent}\n`;
  on(true);
  let total = 0, passed = 0;
  const check = async (...args) => { total++; if (await unchanged(...args)) passed++; };
  try {
    total++;
    const firstWrapper = Element.prototype.scrollIntoView;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("../extension/guard.js", location.href).href;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load the guard a second time"));
      document.head.append(script);
    });
    if (Element.prototype.scrollIntoView !== firstWrapper) throw new Error("Duplicate wrappers installed");
    log("PASS repeated injection leaves one guard instance");
    passed++;
    await check("scrollTop assignment", () => { viewport.scrollTop = viewport.scrollHeight; });
    await check("scrollTo numbers", () => viewport.scrollTo(0, 999999));
    await check("scrollTo smooth options", () => viewport.scrollTo({top: 999999, behavior: "smooth"}), 250);
    await check("scroll alias", () => viewport.scroll({top: 0}));
    await check("scrollBy", () => viewport.scrollBy(0, 300));
    await check("descendant scrollIntoView", () => last.scrollIntoView({block: "end", behavior: "smooth"}), 250);
    await check("ancestor scrollIntoView", () => document.body.scrollIntoView());
    await check("focus scroll prevention", () => last.querySelector("h2").setAttribute("tabindex", "-1") || last.querySelector("h2").focus());
    await check("window methods", () => { window.scrollTo(0, 500); window.scrollBy(0, 300); window.scroll(0, 0); });
    await check("delayed scroll calls", async () => {
      await Promise.resolve(); last.scrollIntoView();
      await wait(15); viewport.scrollTop = 50000;
      await new Promise(resolve => requestAnimationFrame(() => { viewport.scrollTo(0, 0); resolve(); }));
    });
    await check("new response appended while reading", () => {
      const section = document.createElement("section");
      section.textContent = "Streaming response. ".repeat(500);
      turns.append(section);
      section.scrollIntoView({block: "end"});
    });
    await check("quote composer expands and receives focus", () => {
      const input = document.getElementById("input");
      input.style.height = "90px";
      input.focus();
      viewport.scrollTo(0, viewport.scrollHeight);
    });
    await check("synthetic bottom click doesn't bypass protection", () => document.getElementById("native-bottom").click());
    await check("synthetic quote click cannot authorize navigation", () => document.getElementById("quote-now").click());
    await check("source passage without quote intent stays blocked", () => quoteTarget.scrollIntoView({block: "nearest"}));
    await check("synthetic prompt menu cannot authorize navigation", () => document.getElementById("prompt-nav").click());
    await check("synthetic rail cannot authorize navigation", () => document.getElementById("rail-nav").click());
    await check("ordinary menu cannot authorize navigation", () => document.getElementById("unrelated-menu").click());
    await check("user-message start alignment without intent remains blocked", () => navTarget.scrollIntoView({block: "start", behavior: "instant"}));
    await check("nested panel still scrolls", async () => {
      nested.scrollTo({top: 120, left: 90, behavior: "instant"});
      await wait(20);
      if (nested.scrollTop !== 120 || nested.scrollLeft !== 90) throw new Error("Nested scrolling blocked");
    });
    await check("unrelated panel still scrolls", () => {
      const panel = document.getElementById("outside");
      panel.scrollTop = 100;
      if (panel.scrollTop !== 100) throw new Error("Unrelated scrolling blocked");
    });
    await check("paused guard forwards native calls", async () => {
      on(false);
      try {
        viewport.scrollTo({top: 500, behavior: "instant"});
        if (Math.abs(viewport.scrollTop - 500) > 1) throw new Error("Pause failed");
        viewport.scrollTop = 1000;
        // Wait for the result, not a fixed animation duration that varies with
        // browser load/background throttling. CSS smooth applies to scrollTop.
        await waitForPosition(viewport, 1000);
      } finally { position(initialTop()); on(true); }
    });
    await check("protection resumes", () => { viewport.scrollTop = 0; last.scrollIntoView(); });
    await check("stream start restores hidden native button without moving", async () => {
      viewport.removeAttribute("data-scroll-from-end");
      viewport.setAttribute("data-stream-active", "");
      await wait(100);
      if (!viewport.hasAttribute("data-scroll-from-end")) throw new Error("Bottom button flag not restored");
      if (getComputedStyle(document.getElementById("native-bottom").parentElement).opacity !== "1") throw new Error("Bottom button still hidden");
      viewport.removeAttribute("data-stream-active");
    });
    await check("paused guard does not repair website visibility state", async () => {
      on(false);
      viewport.removeAttribute("data-scroll-from-end");
      await wait(100);
      if (viewport.hasAttribute("data-scroll-from-end")) throw new Error("Pause changed visibility state");
      on(true);
      await wait(100);
      if (!viewport.hasAttribute("data-scroll-from-end")) throw new Error("Resume did not restore visibility");
    });
    total++;
    position(viewport.scrollHeight);
    await wait(100);
    if (viewport.hasAttribute("data-scroll-from-end")) throw new Error("Button remains visible at bottom");
    const growth = document.createElement("section");
    growth.style.height = "500px";
    turns.append(growth);
    await wait(100);
    if (!viewport.hasAttribute("data-scroll-from-end")) throw new Error("Streaming growth did not restore button");
    growth.remove();
    position(initialTop());
    log("PASS button hides at bottom and returns when content grows");
    passed++;
    // Root replacement simulates an SPA render. Keep content but replace its
    // viewport node, so stale cached element references fail this test.
    total++;
    const replacement = viewport.cloneNode(false);
    while (viewport.firstChild) replacement.append(viewport.firstChild);
    viewport.replaceWith(replacement);
    nativeTo.call(replacement, {top: 3000, behavior: "instant"});
    replacement.scrollTop = 0;
    const replacementPass = Math.abs(replacement.scrollTop - 3000) < 1;
    log(`${replacementPass ? "PASS" : "FAIL"} replacement viewport`);
    if (replacementPass) passed++;
    while (replacement.firstChild) viewport.append(replacement.firstChild);
    replacement.replaceWith(viewport);
    position(initialTop());
    log(`RESULT ${passed}/${total} passed. Manual gesture and bottom-button tests still required.`);
  } catch (error) {
    log(`ERROR ${error.message}`);
  } finally {
    on(true);
    document.getElementById("run").disabled = false;
  }
}
document.getElementById("run").addEventListener("click", run);
document.getElementById("place").addEventListener("click", () => position(initialTop()));
document.getElementById("native-bottom").addEventListener("click", () => {
  nativeButtonCalls++;
  viewport.scrollTo({top: viewport.scrollHeight, behavior: "smooth"});
});
document.getElementById("send").addEventListener("click", () => last.scrollIntoView({block: "end"}));
for (const [id, delay] of [["rail-nav", 0], ["prompt-nav", 0], ["delayed-nav", 250], ["expired-nav", 1200], ["unrelated-menu", 0]]) {
  document.getElementById(id).addEventListener("click", event => {
    // Synthetic activation is part of the automated negative tests above.
    if (!event.isTrusted) {
      navTarget.scrollIntoView({block: "start", behavior: "instant"});
      return;
    }
    position(initialTop());
    const before = viewport.scrollTop;
    const act = () => {
      viewport.scrollTo({top: 0, behavior: "instant"});
      last.scrollIntoView({block: "end", behavior: "instant"});
      const unrelatedBlocked = viewport.scrollTop === before;
      navTarget.scrollIntoView({block: "start", behavior: "instant"});
      const landed = viewport.scrollTop;
      const shouldMove = id !== "expired-nav" && id !== "unrelated-menu";
      const matched = shouldMove ? Math.abs(landed - before) > 1000 : landed === before;
      log(`${unrelatedBlocked && matched ? "PASS" : "FAIL"} trusted ${id}: ${before} → ${landed}; unrelated scroll blocked=${unrelatedBlocked}`);
      // A consumed permission must not allow another start alignment, either
      // synchronously or from a later animation frame/timer.
      const check = () => {
        position(initialTop());
        navTarget.scrollIntoView({block: "start", behavior: "instant"});
        viewport.scrollTop = 0;
        log(`${viewport.scrollTop === before ? "PASS" : "FAIL"} ${id}: subsequent scrolling blocked`);
      };
      check();
      requestAnimationFrame(check);
      setTimeout(check, 100);
    };
    if (delay) setTimeout(act, delay); else act();
  });
}
document.getElementById("storm").addEventListener("click", () => {
  let ticks = 0;
  const timer = setInterval(() => {
    viewport.scrollTop = viewport.scrollHeight;
    viewport.scrollTo({top: 0, behavior: "smooth"});
    last.scrollIntoView();
    if (++ticks >= 300) { clearInterval(timer); log("STORM ended: 900 automatic scroll attempts."); }
  }, 50);
  log("STORM started. Manually scroll, select text, and click the native bottom button.");
});
viewport.addEventListener("scroll", () => {
  document.getElementById("position").textContent = `Top ${Math.round(viewport.scrollTop)} / ${viewport.scrollHeight - viewport.clientHeight}; site bottom handler calls ${nativeButtonCalls}`;
});

for (const [id, delay] of [["quote-now", 0], ["quote-delay", 250], ["quote-expired", 1200]]) {
  document.getElementById(id).addEventListener("click", event => {
    if (!event.isTrusted) { quoteTarget.scrollIntoView({block: "nearest"}); return; }
    position(initialTop());
    const before = viewport.scrollTop;
    const act = async () => {
      viewport.scrollTo(0, 0);
      quoteTarget.scrollIntoView({block: "end"});
      quoteSource.querySelector("h2").scrollIntoView({block: "nearest"});
      navTarget.scrollIntoView({block: "start"});
      const unrelatedBlocked = viewport.scrollTop === before;
      quoteTarget.scrollIntoView({block: "nearest", behavior: "instant"});
      const landed = viewport.scrollTop;
      const moved = Math.abs(landed - before) > 1000;
      log(`${unrelatedBlocked && moved === (delay < 1000) ? "PASS" : "FAIL"} trusted ${id}: ${before} → ${landed}; unrelated blocked=${unrelatedBlocked}`);
      position(initialTop());
      quoteTarget.scrollIntoView({block: "nearest", behavior: "instant"});
      await wait(100);
      quoteTarget.scrollIntoView({block: "nearest", behavior: "instant"});
      log(`${viewport.scrollTop === before ? "PASS" : "FAIL"} ${id}: consumed or expired permission stays blocked`);
    };
    if (delay) setTimeout(act, delay); else act();
  });
}

// Reproduce virtualized source mounting and invisible math layout separators.
const virtualButton = document.getElementById("quote-now").cloneNode(true);
virtualButton.id = "quote-virtual";
virtualButton.title = "Virtualized mathematical quote";
virtualButton.querySelector("p").textContent = "A = B + C";
quoteMessage.append(virtualButton);
virtualButton.addEventListener("click", async event => {
  if (!event.isTrusted) return;
  position(initialTop());
  const before = viewport.scrollTop;
  const placeholder = document.createElement("div");
  placeholder.dataset.turnIdContainer = "fixture-virtual-source";
  placeholder.dataset.isIntersecting = "false";
  placeholder.style.height = "200px";
  quoteSource.prepend(placeholder);
  placeholder.scrollIntoView({block: "nearest", behavior: "instant"});
  const mounted = viewport.scrollTop !== before;
  // The clicked message can disappear when virtualization mounts its source.
  quoteMessage.remove();
  const source = document.createElement("div");
  source.dataset.turnIdContainer = "fixture-virtual-source";
  source.innerHTML = '<div data-message-author-role="assistant" data-message-id="fixture-math"><p>A = B\u200B + C</p></div>';
  placeholder.replaceWith(source);
  position(before);
  const wrong = quoteTarget;
  wrong.scrollIntoView({block: "nearest", behavior: "instant"});
  const wrongBlocked = viewport.scrollTop === before;
  source.querySelector("p").scrollIntoView({block: "nearest", behavior: "instant"});
  const landed = viewport.scrollTop;
  position(before);
  source.querySelector("p").scrollIntoView({block: "nearest", behavior: "instant"});
  log(`${mounted && wrongBlocked && landed !== before && viewport.scrollTop === before ? "PASS" : "FAIL"} virtualized mathematical quote: mounted=${mounted}, wrongBlocked=${wrongBlocked}, before=${before}, landed=${landed}, after=${viewport.scrollTop}`);
  source.remove();
  document.getElementById("thread-bottom-container").prepend(quoteMessage);
});
