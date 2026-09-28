/* SPDX-License-Identifier: MIT. Invented virtualized fixtures; no chat data. */
"use strict";
let viewport = document.querySelector(".thread-scroll-container");
const content = document.getElementById("content");
const turns = document.getElementById("turns");
const results = document.getElementById("results");
const bottom = document.getElementById("bottom");
const nativeTo = Element.prototype.scrollTo;
const nativeBy = Element.prototype.scrollBy;
let relativeScrollRequests = 0;
Element.prototype.scrollBy = function (...args) {
  if (this === viewport) relativeScrollRequests++;
  return Reflect.apply(nativeBy, this, args);
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const on = enabled => window.dispatchEvent(new CustomEvent("still-scroll:settings:v1", {detail: enabled ? "on" : "off"}));
const position = top => nativeTo.call(viewport, {top, behavior: "instant"});
const y = element => element.getBoundingClientRect().top;
const close = (a, b) => Math.abs(a - b) < 1;
// Sample after layout, before paint. A check made 150 ms later misses a frame
// of displaced text followed by a correction, which is visible as jitter.
async function checkFrames(change, {manual = false, paused = false} = {}) {
  await place(-5000);
  // Give each scenario a fresh reading baseline; a remainder from a previous
  // scenario is not part of the displacement measured relative to this one.
  on(!paused);
  await new Promise(requestAnimationFrame);
  const anchor = visibleText()[0], start = y(anchor);
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;pointer-events:none;visibility:hidden";
  document.body.append(probe);
  let step = 0, samples = 0, maxError = 0, expected = start;
  // The guard's observer was registered first. This observer samples the
  // final layout of each update, including changes made inside an rAF callback.
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      observer.disconnect(); probe.remove(); reject(new Error("pre-paint sampling timed out; keep the fixture in the foreground"));
    }, 15000);
    const observer = new ResizeObserver(() => {
      if (step) {
        samples++;
        maxError = Math.max(maxError, Math.abs(y(anchor) - expected));
      }
      if (step === 36) { clearTimeout(timeout); observer.disconnect(); resolve(); return; }
      requestAnimationFrame(() => {
        step++;
        if (manual) {
          const before = viewport.scrollTop;
          position(before - 3);
          expected += before - viewport.scrollTop;
        }
        if (step % 3 !== 0) change(step);
        if (!paused) viewport.scrollTo({top: 0, behavior: "smooth"});
        probe.style.width = `${step + 1}px`;
      });
    });
    observer.observe(probe);
  });
  probe.remove();
  return {samples, maxError};
}
// A virtualizer can update an ancestor's layout from a descendant's resize
// callback. That ancestor's resize notification may be deferred to the next
// frame by the ResizeObserver depth limit. A shallow sampling probe would
// change that limit and conceal the failure, so sample at the microtask
// checkpoint after the simulated site's callback instead.
async function checkLateLayout(change) {
  await place(-5000);
  const anchor = visibleText()[0], expected = y(anchor);
  const probe = document.createElement("i");
  probe.style.cssText = "display:block;width:1px;height:1px;visibility:hidden";
  document.getElementById("nested").firstElementChild.append(probe);
  let step = 0, samples = 0, maxError = 0;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      observer.disconnect(); probe.remove(); reject(new Error("late-layout sampling timed out"));
    }, 15000);
    const observer = new ResizeObserver(() => {
      if (step) {
        change(step);
        queueMicrotask(() => {
          samples++;
          maxError = Math.max(maxError, Math.abs(y(anchor) - expected));
          if (step === 24) { clearTimeout(timeout); observer.disconnect(); resolve(); }
          else requestAnimationFrame(() => { step++; probe.style.width = `${step + 1}px`; });
        });
      } else requestAnimationFrame(() => { step++; probe.style.width = `${step + 1}px`; });
    });
    observer.observe(probe);
  });
  probe.remove();
  return {samples, maxError};
}
// Typing can notify the guard without changing the conversation layout. After
// fractional layout growth, repeatedly correcting the remaining rounding error
// must not make a completed answer oscillate in response to those notifications.
async function checkTypingStability() {
  await place(-5000);
  const anchor = visibleText()[0];
  const composer = document.getElementById("typing-composer");
  const text = document.createTextNode("Local typing test: ");
  composer.replaceChildren(text);
  const tail = turns.lastElementChild, savedHeight = tail.style.height;
  const height = tail.getBoundingClientRect().height;
  let maxRange = 0, samples = 0, unchangedLayout = true, unnecessaryRequests = 0;
  for (let phase = 1; phase <= 9; phase++) {
    tail.style.height = `${height + phase / 10}px`;
    // Start immediately after the first layout correction. Waiting for several
    // frames would hide a rounding retry that occurs as the next key arrives.
    await Promise.resolve();
    const layout = [viewport.scrollHeight, viewport.clientHeight, anchor.getBoundingClientRect().height];
    const positions = [y(anchor)];
    const requestsBeforeTyping = relativeScrollRequests;
    for (let character = 0; character < 18; character++) {
      text.appendData("x");
      await Promise.resolve();
      positions.push(y(anchor));
      await new Promise(requestAnimationFrame);
      positions.push(y(anchor));
      unchangedLayout &&= anchor.isConnected && layout.every((value, i) =>
        value === [viewport.scrollHeight, viewport.clientHeight, anchor.getBoundingClientRect().height][i]);
      samples += 2;
    }
    maxRange = Math.max(maxRange, Math.max(...positions) - Math.min(...positions));
    unnecessaryRequests += relativeScrollRequests - requestsBeforeTyping;
  }
  tail.style.height = savedHeight;
  return {samples, maxRange, unchangedLayout, unnecessaryRequests};
}
const log = text => {
  const row = document.createElement("div"); row.textContent = text; results.append(row);
  results.scrollTop = results.scrollHeight;
};
for (let i = 0; i < 80; i++) {
  const section = document.createElement("section");
  section.dataset.chatgptSearchUnitKey = `fixture-${i}:0:${i % 2 ? "assistant" : "user"}`;
  section.dataset.chatgptSearchMessageIds = `fixture-${i}`;
  section.dataset.index = i;
  turns.append(section);
}
// Model a reverse-coordinate virtualizer: offscreen sections are empty height
// placeholders. Keeping all paragraphs mounted would conceal the 0.1.5 defect.
function renderVirtual() {
  const top = viewport.scrollHeight - viewport.clientHeight + viewport.scrollTop;
  let offset = 0;
  for (const section of turns.children) {
    const height = section.offsetHeight;
    const visible = offset + height >= top - 440 && offset <= top + viewport.clientHeight + 440;
    if (visible && !section.firstChild) {
      const i = Number(section.dataset.index) + 1;
      section.innerHTML = `<h2 tabindex="-1">Section ${i}</h2><p>Fictional island landmark ${i}.</p>`;
    } else if (!visible && section.firstChild) section.replaceChildren();
    offset += height;
  }
}
viewport.addEventListener("scroll", renderVirtual);
function visibleText() {
  const bounds = viewport.getBoundingClientRect();
  return [...turns.querySelectorAll("p")].filter(p => {
    const rect = p.getBoundingClientRect(); return rect.bottom > bounds.top && rect.top < bounds.bottom;
  });
}
async function place(top) { position(top); await wait(120); }
position(-1400); renderVirtual();
const initialY = y(content);
let siteBottomCalls = 0;
bottom.addEventListener("click", () => { siteBottomCalls++; viewport.scrollTo(0, 0); });
document.getElementById("send").addEventListener("click", () => viewport.scrollTo(0, 0));
document.getElementById("place").addEventListener("click", () => place(-15000));
document.getElementById("grow").addEventListener("click", async () => {
  const anchor = visibleText()[0] || content, before = y(anchor);
  turns.lastElementChild.style.height = `${turns.lastElementChild.offsetHeight + 600}px`;
  await wait(150);
  log(`${close(before, y(anchor)) ? "PASS" : "FAIL"} growth after real bottom click preserves text: ${before} → ${y(anchor)}; site handler calls=${siteBottomCalls}`);
});
document.getElementById("typing").addEventListener("click", async () => {
  const sample = await checkTypingStability();
  log(`${sample.unchangedLayout && sample.maxRange < 0.02 && sample.unnecessaryRequests === 0 ? "PASS" : "FAIL"} typing-only movement: ${JSON.stringify(sample)}`);
});
document.getElementById("run").addEventListener("click", async event => {
  event.currentTarget.disabled = true; results.textContent = "";
  log(`${navigator.userAgent}; devicePixelRatio=${devicePixelRatio}`);
  let passed = 0, total = 0;
  const check = (name, condition) => { total++; passed += +condition; log(`${condition ? "PASS" : "FAIL"} ${name}`); };
  const blocked = async (name, action) => {
    await place(-6000); const before = viewport.scrollTop;
    await action(); await wait(120);
    check(name, close(before, viewport.scrollTop));
  };
  try {
    check("native reverse flow and initial visible passage preserved", getComputedStyle(viewport).flexDirection === "column-reverse" && close(y(content), initialY));
    check("offscreen text is genuinely unmounted", turns.querySelectorAll("p").length < 15);
    for (const top of [-2000, -8000, -15000, -8000, -500]) {
      await place(top);
      check(`virtualized text mounts at ${top}`, visibleText().length > 0 && close(viewport.scrollTop, top));
    }
    await blocked("new root scrollTop", () => { viewport.scrollTop = 0; });
    await blocked("new root scrollTo", () => viewport.scrollTo(0, 0));
    await blocked("new root scroll alias", () => viewport.scroll({top: 0}));
    await blocked("new root scrollBy", () => viewport.scrollBy(0, 800));
    await blocked("unrequested message scrollIntoView", () => turns.lastElementChild.scrollIntoView({block: "end"}));
    await blocked("delayed request", async () => { await wait(100); viewport.scrollTop = 0; });
    await blocked("synthetic bottom activation", () => bottom.click());
    await blocked("send button does not grant scrolling", () => document.getElementById("send").click());
    await place(-5000);
    let anchor = visibleText()[0], before = y(anchor);
    turns.lastElementChild.style.height = "800px";
    await wait(150);
    check("growth below reading position preserves visible text", close(before, y(anchor)));
    await place(0);
    anchor = visibleText()[0] || content; before = y(anchor);
    turns.lastElementChild.style.height = "1400px";
    await wait(150);
    check("growth at bottom preserves text without changing flow", close(before, y(anchor)) && viewport.scrollTop < -500);
    check("footer control recovers after layout-only growth", getComputedStyle(bottom).opacity === "1" && bottom.getAttribute("aria-hidden") === "false" && bottom.tabIndex === 0);
    await place(-5000);
    anchor = visibleText()[0]; before = y(anchor);
    turns.firstElementChild.style.height = "550px";
    await wait(150);
    check("remeasurement above viewport preserves visible text", close(before, y(anchor)));
    const originalHeight = viewport.style.height;
    before = y(anchor); viewport.style.height = "360px";
    await wait(150);
    check("viewport resize preserves visible text", close(before, y(anchor)));
    viewport.style.height = originalHeight; await wait(150);
    before = y(anchor); on(false); await wait(100);
    check("pause leaves native layout and passage intact", getComputedStyle(viewport).flexDirection === "column-reverse" && close(before, y(anchor)));
    check("pause restores footer presentation", bottom.style.opacity === "" && bottom.getAttribute("aria-hidden") === "true");
    viewport.scrollTo({top: -900, behavior: "instant"}); await wait(100);
    check("paused root allows scrolling", close(viewport.scrollTop, -900));
    before = y(content); on(true); await wait(150);
    check("resume leaves native coordinates unchanged", close(before, y(content)) && close(viewport.scrollTop, -900));
    await blocked("resumed protection", () => { viewport.scrollTop = 0; });
    await blocked("nested panel remains independent", () => {
      const nested = document.getElementById("nested"); nested.scrollTo({top: 50, left: 40}); nested.scrollTop = 90;
      check("nested coordinates", close(nested.scrollTop, 90) && close(nested.scrollLeft, 40));
    });
    const outside = document.getElementById("outside"); outside.scrollTop = 60;
    check("unrelated panel remains native", close(outside.scrollTop, 60));
    await place(-4000);
    const replacement = viewport.cloneNode(false);
    while (viewport.firstChild) replacement.append(viewport.firstChild);
    viewport.replaceWith(replacement); viewport = replacement;
    viewport.addEventListener("scroll", renderVirtual);
    await wait(150); await place(-4000);
    viewport.scrollTop = 0;
    check("SPA replacement protects native viewport and renders text", close(viewport.scrollTop, -4000) && visibleText().length > 0 && getComputedStyle(viewport).flexDirection === "column-reverse");
    // A new generation arriving in the same frame as a manual/native scroll
    // must not cancel the deliberate movement.
    anchor = visibleText()[0]; before = y(anchor);
    position(viewport.scrollTop - 120);
    turns.lastElementChild.style.height = "1700px";
    await wait(150);
    check("manual movement survives simultaneous output growth", close(y(anchor), before + 120));
    for (const manual of [false, true]) {
      const sample = await checkFrames(step => {
        turns.lastElementChild.style.height = `${turns.lastElementChild.offsetHeight + (step % 2 ? 5 : 17)}px`;
      }, {manual});
      check(`every pre-paint position during streaming${manual ? " plus manual movement" : ""}: ${sample.samples} samples, max error ${sample.maxError.toFixed(2)}px`,
        sample.samples === 36 && sample.maxError < 1);
    }
    for (const [name, change] of [
      ["output shrinkage", step => {
        turns.lastElementChild.style.height = `${turns.lastElementChild.offsetHeight - (step % 2 ? 5 : 17)}px`;
      }],
      ["subpixel growth", () => {
        turns.lastElementChild.style.height = `${turns.lastElementChild.getBoundingClientRect().height + 0.4}px`;
      }],
      ["DOM reflow with unchanged total height", () => {
        turns.firstElementChild.style.height = `${turns.firstElementChild.offsetHeight + 3}px`;
        turns.lastElementChild.style.height = `${turns.lastElementChild.offsetHeight - 3}px`;
        turns.firstElementChild.append(document.createTextNode("."));
      }],
      ["viewport resize", step => { viewport.style.height = `${360 + step % 2 * 15}px`; }]
    ]) {
      const sample = await checkFrames(change);
      check(`every pre-paint position during ${name}: ${sample.samples} samples, max error ${sample.maxError.toFixed(2)}px`,
        sample.samples === 36 && sample.maxError < 1);
    }
    on(false);
    const unprotected = await checkFrames(() => {
      turns.lastElementChild.style.height = `${turns.lastElementChild.offsetHeight + 5}px`;
    }, {paused: true});
    check("paused negative control exposes native reverse-flow movement", unprotected.samples === 36 && unprotected.maxError > 100);
    on(true);
    const resumed = await checkFrames(() => {
      turns.lastElementChild.style.height = `${turns.lastElementChild.offsetHeight + 5}px`;
    });
    check(`resume restores pre-paint stability: max error ${resumed.maxError.toFixed(2)}px`, resumed.samples === 36 && resumed.maxError < 1);
    for (const [name, change] of [
      ["inline style", () => {
        turns.lastElementChild.style.height = `${turns.lastElementChild.offsetHeight + 28}px`;
      }],
      ["class change", step => {
        turns.classList.toggle("late-layout-gap", step % 2 === 1);
      }]
    ]) {
      const sample = await checkLateLayout(change);
      check(`layout changed by ${name} inside a site's resize callback: ${sample.samples} samples, max error ${sample.maxError.toFixed(2)}px`,
        sample.samples === 24 && sample.maxError < 1);
    }
    await wait(150);
    let idleRepairs = 0;
    const repairObserver = new MutationObserver(records => { idleRepairs += records.length; });
    repairObserver.observe(bottom, {attributes: true, attributeFilter: ["style"]});
    await wait(250);
    repairObserver.disconnect();
    check(`footer repairs settle without a mutation feedback loop: ${idleRepairs} idle writes`, idleRepairs === 0);
    const typing = await checkTypingStability();
    check("typing fixture leaves answer and viewport layout unchanged", typing.unchangedLayout);
    check(`typing alone never moves the answer: ${typing.samples} samples, range ${typing.maxRange.toFixed(2)}px`,
      typing.samples === 324 && typing.maxRange < 0.02);
    check(`typing alone issues no scroll corrections: ${typing.unnecessaryRequests} requests`, typing.unnecessaryRequests === 0);
    log(`RESULT ${passed}/${total} passed. Real wheel, keyboard, bottom click, and live history loading still required.`);
  } catch (error) { log(`ERROR ${error.message}`); }
  finally { on(true); document.getElementById("run").disabled = false; }
});
