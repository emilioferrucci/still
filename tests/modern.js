/* SPDX-License-Identifier: MIT. Invented virtualized fixtures; no chat data. */
"use strict";
let viewport = document.querySelector(".thread-scroll-container");
const content = document.getElementById("content");
const turns = document.getElementById("turns");
const results = document.getElementById("results");
const bottom = document.getElementById("bottom");
const nativeTo = Element.prototype.scrollTo;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const on = enabled => window.dispatchEvent(new CustomEvent("still-scroll:settings:v1", {detail: enabled ? "on" : "off"}));
const position = top => nativeTo.call(viewport, {top, behavior: "instant"});
const y = element => element.getBoundingClientRect().top;
const close = (a, b) => Math.abs(a - b) < 1;
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
document.getElementById("run").addEventListener("click", async event => {
  event.currentTarget.disabled = true; results.textContent = "";
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
      check("nested coordinates", nested.scrollTop === 90 && nested.scrollLeft === 40);
    });
    const outside = document.getElementById("outside"); outside.scrollTop = 60;
    check("unrelated panel remains native", outside.scrollTop === 60);
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
    log(`RESULT ${passed}/${total} passed. Real wheel, keyboard, bottom click, and live history loading still required.`);
  } catch (error) { log(`ERROR ${error.message}`); }
  finally { on(true); document.getElementById("run").disabled = false; }
});
