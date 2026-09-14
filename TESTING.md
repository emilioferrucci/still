# Test report — Still 0.1.2

## Generating-state bottom control, 14 September 2026

Firefox Developer Edition 156.0, existing disposable long test chat.
With 0.1.1, starting a response while reading an older answer removed the
viewport's `data-scroll-from-end` flag despite a large measured distance from
the bottom. The original button remained in the DOM, but its wrapper had
computed opacity zero. Dispatching a scroll event did not repair that state.
Restoring the flag made the native button reappear without moving the viewport.

Version 0.1.2 synchronizes this presentation flag with actual geometry through
event-driven, coalesced animation-frame checks. It does not replace the button
or change its arrow/dots content. Repairs stop when protection is paused.

The installed persistent 0.1.2 package was verified active and byte-identical
to the built XPI, then the chat was reloaded. A new long test response showed
the native three-dot button while generating. A real mouse click jumped from
the first answer to the currently streaming response. A subsequent two-second
measurement held exactly 37,631.5 CSS pixels while content grew by 260 pixels;
generation was still active and the away-from-bottom flag was present.

The Firefox lab passed **26/26 checks**: the previous 23 plus hidden-button
recovery without scrolling, pause/resume of visibility repairs, and hiding at
the bottom followed by reappearance when content grows. Extension lint reported
zero errors, warnings, or notices. No permissions or network behavior changed.

Limits: the visibility repair depends on ChatGPT's current presentation flag.
It uses a 48 CSS pixel distance threshold. These tests do not establish behavior
for every layout change, background-tab throttle, or future ChatGPT version.
Prior reports below retain their original version-specific results.

---

# Test report — Still 0.1.1

## Prompt navigation regression, 14 September 2026

Tested in Firefox Developer Edition 156.0 on macOS using the existing disposable
long test chat. No existing personal chats were accessed or deleted.

The right-hand prompt navigator was blocked in 0.1.0. Live diagnostics showed
that an intentional menu click calls `scrollIntoView` on the selected user
message with start alignment, followed by repeated scrolling requests. Both the
compact rail and its expanded menu must be recognized.

Version 0.1.1 permits one such request following a trusted navigation click,
with a one-second expiry. Other scrolling methods remain blocked. The installed
persistent XPI was verified as active version 0.1.1 and byte-identical to the
built package. The live chat was reloaded to remove all prototype diagnostics.

Live verification of the installed build:

- Expanded menu: jump forward to prompt 6 and its F01 answer — passed.
- Expanded menu: jump backward to prompt 2 and its B01 answer — passed.
- Existing down-arrow button: jump to the end, showing F24/F25 — passed.
- Manual upward scrolling from the bottom — passed.
- Subsequent script attempts using `scrollTop`, `scrollTo`, and user-message
  `scrollIntoView`: position remained exactly 28,576 CSS pixels — passed.

The local Firefox lab passed **23/23 automated checks**, retaining the 19 cases
below and adding synthetic compact/expanded menu clicks, an unrelated menu,
and user-message scrolling without a trusted navigation action.

Additional real UI clicks tested the compact rail, expanded menu, and a 250 ms
delayed handler: each moved from 11,096 to 22,864.5 CSS pixels. An expired 1,200 ms
handler and an unrelated menu left the position at 11,096. Requests before the
allowed jump and subsequent synchronous, animation-frame, and timer requests
remained blocked. These checks used the final guard source.

An early real-click test caught an overly broad expanded-menu match. Requiring
the fixed-position navigation container corrected it; the full suite and real
click cases were rerun successfully. The pause test also needed a longer bounded
wait for native CSS smooth scrolling; this changed the test, not extension behavior.

Limits: this is targeted regression testing, not exhaustive coverage. The live
compact rail was exercised, but its expanded menu provided the confirmed live
destination checks; the compact handler was independently verified in the lab.
Navigation taking longer than one second or changes to ChatGPT's markup/API may
require another update. Cancellation by another manual gesture is implemented
but was not independently timed in this run. The older quoted-reply and streaming
results below are historical 0.1.0 tests, not newly repeated live tests for 0.1.1.

---

# Test report — Still 0.1.0

Tested on 14 September 2026 using **Firefox 155.0.1 on macOS 15.6.1**.
Live ChatGPT tests used Firefox at 110% zoom. The deterministic lab
ran in a separate private Firefox window at 100% zoom, with local generated text
and the actual guard source. A dedicated empty profile was created, but its
separate-browser launch did not produce an accessible window, so the lab used
private browsing instead. The original default profile was restored and verified.

An OpenAI coding agent operated the Firefox UI through native computer automation. Existing chats
were not opened, edited, renamed, or deleted. Two new test chats were created;
neither was deleted. Their URLs and account details are deliberately omitted
from this public-source report.

## Live ChatGPT results

Test chat A grew through six user prompts: a 40-section document response, an
ordinary long response with 25 numbered paragraphs, and further quoted and long
responses containing tables, code, and displayed mathematics. Test chat B began
with a one-word answer, then a long response and a quoted third prompt.

| Case | Observation | Result |
| --- | --- | --- |
| Baseline, protection absent: follow-up while reading the beginning of the 40-section answer | View moved to the new prompt. Console diagnostics caught `scrollIntoView({behavior:"smooth",block:"end"})`. | Problem reproduced |
| Baseline, protection absent: select text → Ask ChatGPT → send quoted reply | Adding the quote preserved position; sending moved to the new prompt. | Problem reproduced |
| Quote from latest ordinary answer, send with Enter | Scroll position remained exactly 23,417.166 px from submission through completion; one intercepted scroll call was recorded. | Pass |
| Quote from an older ordinary answer, send with mouse | Position remained exactly 15,376.167 px through completion, leaving the tab, and returning; one intercepted call was recorded. | Pass |
| Existing down-arrow button while reading near the start | One click moved from the beginning to the current bottom, about 24,051 px. | Pass |
| Send a long new prompt while at bottom | Previous answer remained visible instead of the new prompt being pulled to the top. Screenshot observation. | Pass |
| Jump once during streaming, then make a small upward manual scroll | After the measuring point, position stayed exactly 28,423.084 px through the remainder of generation and completion. The output was still streaming when measurement began. | Pass |
| Firefox Find in long conversation | Find located B03 in an older answer and intentionally moved to it. | Pass |
| Popup pause, then reload the test chat | Paused preference remained set. A native `scrollTo` moved from 19,668.916 px to approximately 499.583 px. | Pass |
| Resume from the extension UI | The same attempted scroll left position unchanged at 499.583 px. | Pass |
| New chat: short reply → first long response | Began at top; no first-scroll exemption or initial jump. MAIN-world guard verified present. | Pass |
| Stop a generating answer in the new chat | Stop was actually clicked before generation completed; original reading position stayed visible. | Pass |
| Third prompt quoting the new chat's long answer | From the start of monitoring, position stayed exactly 0 px through stopping and the subsequent quoted answer's completion. Final content height was 6,664 px. | Pass |
| Reload the final extension without reloading the live page | Protection had been verified after the final code reload. A subsequent extension-only reload left the native bottom button working in test chat B. | Pass |

Pixel measurements are CSS pixels from the conversation's own `scrollTop`.
Firefox's fractional values are preserved above to distinguish measured results
from visual impressions. Temporary diagnostics were confined to these new chats
and are not included in the extension package. These are representative tests,
not a statistical guarantee about all future ChatGPT behavior.

## Deterministic Firefox lab

The lab generated 120 long sections and reached a scroll range of approximately
51,088 px. The final suite completed with **19/19 checks passed**:

1. Direct `scrollTop` assignment.
2. Numeric `scrollTo` arguments.
3. Smooth `scrollTo` options.
4. `scroll` alias.
5. `scrollBy`.
6. Descendant `scrollIntoView`.
7. Ancestor `scrollIntoView`.
8. Focus without moving the conversation.
9. Window scrolling methods do not move the conversation.
10. Delayed calls from a promise, timer, and animation frame.
11. Appending a long response while reading.
12. Expanding and focusing a quoted-reply composer.
13. A synthetic bottom-button click does not open an automatic-scroll exception.
14. Independent nested horizontal and vertical scrolling.
15. An unrelated scrolling panel remains usable.
16. Paused guard passes scrolling through, including a smooth setter.
17. Protection resumes.
18. Replacing the viewport node does not leave a stale cached target.
19. Repeated injection leaves one guard instance instead of stacking wrappers.

The first run exposed an incorrect test assumption: a native `scrollTop` setter
can animate under CSS smooth scrolling. The test was fixed to wait for that
animation; no extension code change was needed for this failure. The corrected
suite completed successfully.

A separate **15-second, 900-call stress run** attempted repeated `scrollTop`,
`scrollTo`, and `scrollIntoView` calls. Native manual scrolling moved 15,776 →
16,166 px; the native bottom control moved to 51,088 px; manual upward scrolling
and Page Up then moved to 50,308 px. The site button's own handler did not run on
the real click, confirming that the dedicated native-scroll path handled it.
The final position remained under manual control when the storm ended.

After adding the repeated-injection guard, all 19 checks were rerun. A real
bottom-button click after duplicate injection still moved 15,776 → 51,088 px,
without invoking the site's own handler. The final guard was also reloaded in
both new live test chats and verified active.

## Package checks

- JavaScript syntax checks passed for the guard, settings, popup, and test lab.
- Mozilla `web-ext` **10.6.0**: **0 errors, 0 warnings, 0 notices** for the release
  manifest, with Firefox 142 as the minimum version.
- No external runtime dependency, network API call, remote code, or telemetry.
- The testing manifest has narrower URL inclusion rules; its guard, settings,
  popup, and icon files are identical to the release files.
- The unsigned ZIP is not a signed or publicly published add-on.

## Persistent personal installation — Developer Edition

On 14 September 2026, installed Firefox Developer Edition (application version
156.0, build 20260909090529) alongside standard Firefox. macOS accepted the browser
as notarized and its application signature validated before installation.

In its separate default profile, changed only the extension-signature requirement
to allow unsigned packages. Installed Still through the ordinary Add-ons Manager
file installer. The installed XPI is byte-for-byte identical to the previously
tested unsigned ZIP (SHA-256
`cc1cfe027853effbd61cfceee103b4c6b4d9db44c8280f02a02e89572916dd32`).
Firefox's add-on metadata recorded an active `app-profile` installation, with
neither user nor application disabling it.

Confirmed the full quit in Firefox's quit dialog, then reopened Developer Edition.
The toolbar popup remained available with **Stop automatic scrolling** checked.
On a fresh ChatGPT home tab, verified the guard's installed flag and wrapped page
scrolling function. The standard Firefox profile's signature preference remained
at its default. No Mozilla Add-ons submission or signing took place.

This was an installation, restart, and automatic-injection smoke test, not a
repeat of the full live scrolling suite. ChatGPT was logged out in the new
profile; sign-in is required for ordinary account-based personal testing.

## Limits and remaining checks

- Actual human trackpad inertia and accessibility-device behavior need ordinary
  user testing. Native automation exercised scrolling and keyboard input, but it
  is not identical to every physical input device.
- Windows, Linux, Android, older Firefox versions, and other ChatGPT interface
  variants were not tested. Firefox 142 is a declared API compatibility floor;
  this run tested 155.0.1 only. Android is not advertised as supported.
- The extension blocks page scrolling APIs. Browser layout reflow, scroll-range
  clamping when content shrinks, or future virtualization changes may still
  alter what appears on screen. It does not maintain a saved text anchor or
  promise to prevent every possible browser-induced movement.
- With protection enabled, initial scripted positioning is blocked too. A
  freshly loaded conversation may start at the top; use its bottom button.
  Exact reading positions are not stored across reloads.
- ChatGPT markup can change. If it changes its scroll root or bottom button,
  selectors and the corresponding regression tests may need updating.
- Mozilla signing and a smoke test of the signed package remain release steps.

## Reproduce or extend the tests

Open `tests/lab.html` in a separate private Firefox window and click **Run
automated checks**. Use **Place at section 40** and **Start 15-second scroll
storm** to test your own input device. The page has no network dependencies.

For live tests, create disposable new chats and preserve them. Use ordinary long
answers, quote selections near their beginning and middle, and repeat on both
latest and older replies. Check submission, streaming, stopping, completion,
bottom-button clicks, slight upward scrolling, Find, and pause/resume. Record
new failures with the Firefox version and a reproduction sequence, without
publishing private conversation text.
