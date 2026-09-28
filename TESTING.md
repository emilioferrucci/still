# Test report — Still 0.1.9

## Typing-only scroll corrections, 28 September 2026

The user reported small answer-text wobble while typing after the severe jitter
appeared resolved. This change only separates measured paragraph position from
the carried fractional scroll remainder. A notification with no new layout
displacement no longer retries that remainder; the next real layout change
still consumes it. The 0.1.8 style/class observation, relative corrections,
native reverse flow, and navigation behavior are retained.

All validation recorded in this section used local files with invented text in
**ordinary Firefox 156 on macOS**. Developer Edition was not used. Never use
ChatGPT Pro or paid model credits for extension testing. Do not delete any chats,
including test chats.

### Reproducible regression and limits

The fixture wraps the native `scrollBy` function with a counter and forwards
calls unchanged. It seeds nine fractional layout changes, then makes 18 composer
text edits after each change. It samples paragraph position after each mutation
and in the next animation frame, and verifies that answer and viewport sizes
remain unchanged during typing.

With the same fixture at 100% zoom, committed 0.1.8 passed **43/44** checks. Its
only failure was **334 unnecessary native scroll requests** during typing.
The revised guard passed **44/44**, with **zero scroll requests** and zero
measured movement across 324 typing samples. The original guard also had zero
measured typing movement: these tests reproduce the redundant calls, not the
user's visible wobble. Removing them is a targeted mitigation; the rendered
symptom still needs user confirmation.

### Regression coverage

The revised current-layout suite passed **44/44 at both 100% and 110% zoom**.
Coverage includes genuinely unmounted history, blocked automatic scroll APIs,
manual movement during output growth, pause/resume, nested panels, viewport
replacement, fractional growth, internal reflow, viewport resizing, and late
inline-style/class changes. Protected frame-level error stayed below one CSS
pixel (maximum 0.40 at 100% zoom and 0.92 at 110%). The paused negative control
detected native movement. Footer repairs settled with zero idle writes.

Fixture precision was corrected for zoom: manual movement expectations now use
the actual native scroll delta, nested-panel coordinates allow less than one
CSS pixel of rounding, and independent frame scenarios reset their reading
baseline. The old and revised guards were compared using those same checks.

Actual keyboard input in the local composer produced **77 input events**, zero
measured answer movement, zero scroll corrections, and a connected answer
paragraph. Native wheel and Page Up scrolling mounted readable earlier sections.
A trusted bottom-button click reached the final section; further output growth
preserved position. The legacy suite passed **28/28**. A trusted compact prompt
navigation click reached its target while unrelated and subsequent automatic
scrolling remained blocked.

These local checks load the production guard directly. They do not validate a
fresh extension installation or the current live ChatGPT interface, and they
are not compositor video measurements. This build has unchanged permissions.
JavaScript syntax and whitespace checks passed. Mozilla web-ext lint reported
zero errors, warnings, and notices; its optional update checker could not write
its config. The unsigned XPI was built locally and was not installed in
Developer Edition during this task.

---

# Historical test report — Still 0.1.8 candidate

## Rendered jitter investigation, 28 September 2026

The user's local video confirms that **0.1.7 still has severe rendered jitter**.
All 4,056 frames of the 67.65-second, approximately 60 fps recording were decoded.
Consecutive-frame inspection found an 18-recording-pixel displacement followed
by a snap back; another burst displaced text by approximately 92 recording
pixels. These are recording pixels, not CSS pixels. The video and derived
diagnostics remain private and are not included in this repository or packages.

The 0.1.7 geometry tests below were insufficient to rule out this defect. Their
results must not be read as confirmation that the user's rendering problem was
fixed. Sparse screenshots also missed single-frame displacement.

The initial 0.1.8 candidate changed the native method used to compensate layout
growth: it sent a relative `scrollBy` delta instead of an absolute `scrollTo` target.
The explicit bottom button still uses an absolute destination. Native reverse
coordinates, the site's virtualizer, API interception, and permissions remain
unchanged.

Mozilla's implementation distinguishes these paths:
[Element.cpp](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/dom/base/Element.cpp)
dispatches to separate absolute and relative frame methods;
[ScrollContainerFrame.cpp](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/layout/generic/ScrollContainerFrame.cpp)
uses `ScrollOrigin::Relative` for relative CSS-pixel scrolling. The compositor
can apply relative updates to its existing sampled positions. A mismatch between
absolute corrections and the compositor's visual offset is a **hypothesis** for
the recorded defect, not an independently proven root cause. That change alone
was insufficient in the targeted late-layout regression below.

### Reproduced missing observation path

The guard observed text mutations but excluded `style` and `class` attributes.
A site's ResizeObserver callback can change an ancestor's layout through those
attributes after the guard's callback has run. ResizeObserver's depth limit can
defer the resulting ancestor notification to the next frame. See the W3C
[notification algorithm](https://drafts.csswg.org/resize-observer/#broadcast-resize-observations).

Two added tests simulate that sequence using a deep resize target, then measure
at the callback's microtask checkpoint. They deliberately avoid a shallow resize
probe: such a probe changes the observer depth limit and can allow extra ancestor
notifications that conceal the defect. The relative-scroll-only candidate passed
the original 38 tests but failed both new tests: **28 CSS pixels** of displacement
for inline styles and **40 CSS pixels** for class changes, over 24 samples each.

The revised 0.1.8 also observes relevant inline-style and class mutations. It
ignores unrelated styling and the guard's own footer style writes so that a
repair cannot perpetually schedule another repair. Both new regressions now
have **zero displacement**. An additional idle check recorded zero footer style
writes after layout settled. The relative-delta adjustment is retained, but is
not credited with fixing these two reproduced failures.

### Current validation

Tested in Firefox Developer Edition 157 on macOS. The current-layout fixture
passed **41/41** checks, including virtualized history, negative coordinates,
blocked automatic APIs, nested panels, viewport replacement, pause/resume, and
the eight frame-level scenarios. Protected whole-pixel scenarios had zero
maximum error; fractional growth reached 0.60 CSS pixels and internal reflow
0.60 CSS pixels. The paused negative control detected over 100 pixels of native
movement. These are geometry tests, not compositor video measurements.

The legacy fixture passed **28/28**. A trusted prompt-navigation click reached
its target while unrelated scrolling stayed blocked. The virtualized
mathematical-quote check mounted the source, rejected the wrong source, and
preserved blocking after the deliberate jump.

The initial candidate was installed persistently and verified enabled as version
0.1.8 before the missing observation path was identified. That earlier package
is superseded by the revised build. The revised XPI was then installed through
the normal add-on manager, verified enabled, and loaded by reloading only the
authorized test branch. A wrapper stack location matched the revised source,
distinguishing it from the earlier same-version candidate. Its SHA-256 is
`ed2f950ab3eeb03acaaf2d0b0fde0319c851299ff231f98a0ce232f1758b1f19`.
JavaScript syntax and whitespace checks passed. Mozilla web-ext lint reported
zero errors, warnings, and notices; its optional update checker could not write
its config.

### Live follow-up and reopened history

Only the explicitly authorized test branch was used for live messages. A
preliminary measurement accidentally selected a composer paragraph; that run
was discarded. The corrected probe required a paragraph in an assistant answer
and excluded the footer and every editable element.

The validated paragraph stayed connected. Across 65 changed-geometry samples
at the normal viewport height, its top ranged from **137.483 to 138.583 CSS
pixels** while conversation height ranged from **17,522 to 18,112 pixels**.
The monitor ran 11,308 frame callbacks overall. This covers the measured
follow-up submission and response-layout changes, not independently recorded
compositor output or every thinking-to-answer transition.

After another reload, real upward scrolling reached readable earlier
mathematical passages. The viewport retained native `column-reverse` coordinates.
This live check did not independently establish that an older server-side
pagination batch was initially absent; the fixture's genuinely unmounted
history checks provide the repeatable coverage for that case. All temporary
monitoring loops were stopped and a reload cleared their page state. No chats
were deleted and no unrelated conversation was opened.

### Recording limitation

A local, explicitly authorized window-recording attempt failed: Firefox's
`getDisplayMedia` returned `NotFoundError` after the permission prompt, without
providing a capture source. No new video was recorded. Browser/security settings
were not changed. The supplied video proves the old defect; it does not prove
the candidate removes it. Rendered jitter remains unverified for this candidate.

---

# Historical test report — Still 0.1.7 (rendered jitter subsequently confirmed)

## Streaming jitter regression, 27 September 2026

Tested in **normal Firefox 156.0.1 on macOS**, never Firefox Developer Edition.
The 0.1.6 reading-anchor correction ran from a scheduled animation frame, even
when triggered by a resize notification after that frame's callbacks. This
allowed one frame of displaced text to render before the next-frame correction.
The existing tests waited 150 ms and missed that intermediate movement.

The guard now corrects layout displacement directly in mutation and resize
callbacks before paint. Footer presentation remains coalesced in rAF. It keeps
a visible passage as its anchor across internal reflow, and carries forward
fractional errors from Firefox's scroll rounding instead of accumulating drift.
JavaScript scroll requests are still intercepted before they execute; native
reverse flow, negative coordinates, manual input, and navigation are preserved.

### Frame-level browser checks

`tests/modern.html` now samples after layout with a ResizeObserver created after
the guard's observer. A separate fixed probe changes size each frame, ensuring
samples even when conversation height stays constant. Updates occur inside rAF,
with idle frames between growth updates, exercising the former late correction.
These are pre-paint geometry samples, not a recording of the compositor output.

Unmodified **0.1.6 passed the original 30 checks but failed both initial new
streaming checks**, with up to **17 CSS pixels** of displacement, including
when manual movement coincided with output growth. That provides a repeatable
regression without requiring a private conversation or an intermittent live event.
The complete expanded suite scored **31/38** against 0.1.6: all seven protected
frame-level scenarios failed; the paused negative control correctly detected
movement. Subpixel drift reached 9.6 pixels and viewport resizing reached 45 pixels.

The revised guard passed **38/38** checks. Each of the eight frame-sampling
scenarios collected 36 samples: streaming, streaming plus manual movement,
shrinkage, fractional growth, internal DOM reflow with unchanged total height,
viewport resize, paused negative control, and resumed protection. Protected
whole-pixel scenarios had 0-pixel maximum error; fractional growth and internal
reflow stayed within 0.4 pixels without cumulative drift. The paused negative
control exposed over 100 pixels of native reverse-flow movement, confirming
that the sampler detects the problem when protection is absent.

The legacy fixture passed **28/28**. A real compact prompt-rail click reached
its target while subsequent unrelated programmatic scrolls stayed blocked.

### Live follow-up streaming

A new chat containing only invented botanical guides was used. While a second
long answer streamed, an already completed paragraph remained connected and
between 106.75 and 107.25 CSS pixels across 49 resize samples. Conversation
height grew from 4,454 to 5,944 pixels. Normal Firefox's page zoom was 110%.
Screenshots showed readable earlier text before and during the follow-up.
Real wheel scrolling in both directions and the native bottom button worked.

An earlier measurement of the first answer became invalid when the streaming
paragraph was replaced by the site; it is not counted as passing evidence.
The completed-paragraph follow-up measurement above did not have that problem.

### Initially unloaded history

Restarted normal Firefox, reloaded the packaged 0.1.7 temporarily, and extended
the same invented-data chat to 12 exchanges. In a fresh page, both long-guide
markers were absent: 18 message units, height 2,126 CSS pixels, scrollTop
-517.3833618164062, with native `column-reverse` intact. Earlier attempts with
a shorter history loaded everything, so those were not counted as an unloaded
history test.

Real upward wheel gestures fetched the older batch. Both guide markers appeared,
and screenshots showed readable text through the first guide's opening
paragraphs. After loading, height was 8,764 pixels. `scrollTo`, a `scrollTop`
assignment, and paragraph `scrollIntoView` left -8,155.75 unchanged. Temporary
page diagnostics were cleared by reloading the test tab.

JavaScript syntax and whitespace checks passed. Mozilla web-ext lint reported
0 errors, 0 warnings, and 0 notices; its optional update checker could not write
its config. The tested XPI's guard and manifest match the source. Its ID,
host access, and permissions match 0.1.6. Developer Edition was not accessed or
updated. Normal Firefox has a temporary 0.1.7 installation until it exits.

### Scope and limits

The frame-level regression is reproducible. The user's exact intermittent live
jitter has no known reproduction and was not independently reproduced in a
personal chat. These results cover the observed failure mechanism, not every
possible animation or site layout change. No personal chats were used, no chats
were deleted, and no browser security settings or extension permissions changed.

---

# Test report — Still 0.1.6

## Reopened-history regression, 26 September 2026

Version 0.1.5 changed the modern ChatGPT viewport from `column-reverse` to
`column`, replacing native negative scroll coordinates with positive ones. A
virtualizer that expects reverse coordinates can then mount the wrong content,
as the new fixture demonstrates. This is the suspected cause of the reported
live regression; the exact live blank state was not reproduced. Testing
already-rendered messages did not cover this risk.
Version 0.1.6 removes that layout override entirely. It compensates for output
growth by measuring a visible element, subtracting native/manual movement from
its displacement, and using a private native scroll method only for the remaining
layout displacement. Pause/resume never changes the site's layout.

### Repeatable normal-Firefox checks

The rewritten `tests/modern.html` fixture contains 80 placeholders but mounts
only nearby text. Its virtualizer uses native reverse coordinates. Against the
packaged 0.1.5 guard, all five older-history positions failed to mount visible
text; the later growth test consequently could not find a visible paragraph.
Against 0.1.6, **30/30 checks passed**, including remounting in both directions,
negative coordinates, API blocking, simultaneous manual movement and growth,
growth above and below the reading position, viewport resize, pause/resume,
footer recovery, nested panels, and SPA viewport replacement.

Real wheel scrolling and Page Up mounted earlier numbered sections. A trusted
bottom click reached section 80, and a subsequent 600-pixel output expansion
preserved the measured content position. The legacy fixture passed **28/28**. Trusted prompt-rail and virtualized
mathematical quote clicks also passed, including rejection of a wrong source
and subsequent automatic scroll requests.
These are fixture results; live reopened-history evidence is recorded separately.

JavaScript syntax checks passed. Mozilla web-ext lint reported **0 errors,
0 warnings, 0 notices**; its optional update checker could not write its config.
No extension permissions or network behavior changed.

### Live reopened-history check

Used normal Firefox only for the revised-build tests. Two new test chats were
created; no chats were deleted and no personal chat was used for testing. A
second chat used Instant for generated fixtures after Pro generation was slow.
Its history contains two long invented guides and short numbered exchanges.
The original Pro setting was restored before the browser restart.

Quit normal Firefox completely, launched it again, and temporarily loaded the
packaged 0.1.6 XPI. On opening the saved test chat, both earlier guide markers
were absent from the DOM: only 10 message units were mounted, the content height
was 1,243 CSS pixels, and native `column-reverse` was intact. Native wheel and
Home-key scrolling loaded successive older batches. Both long guides and the
first numbered paragraphs became readable. After loading, height was 15,307
pixels; `scrollTo`, `scrollTop`, and passage `scrollIntoView` held the viewport
at -14,810.2001953125 CSS pixels. A second reload again showed only the
latest five exchanges; scrolling loaded both older guides again. The native
bottom button and scrolling down through loaded content remained usable.

During real streaming before restart, the HISTORY-A-START passage stayed at
168.6999969482422 CSS pixels while content height grew from 3,388 to 3,700 and
scrollTop changed from -2,806.199951171875 to -3,118.050048828125. This checks
visible text stability, rather than treating a fixed scrollTop as success.

**Limit:** the exact live blank-text symptom was not reproduced in the generated
chat with 0.1.5: one initially absent older guide did load after scrolling. The
old build's failure is reproducible in the reverse-coordinate virtualization
fixture. The new build removes that incompatible layout change, and live
fresh-session history loading passed, but this is not proof that every cause
of blank content in much larger chats is resolved. No revised build was
installed or tested in Developer Edition; installation there is left to the
user. No security settings were changed.

---

# Test report — Still 0.1.5 (superseded: history-loading regression)

**Known failure:** this version changed ChatGPT’s reverse flex layout and broke
loading older, unmounted messages. The tests below did not cover reopening a long
conversation with unloaded history. Their passing results were insufficient to
establish compatibility. Do not use 0.1.5.

## ChatGPT layout change, 26 September 2026

Tested in normal Firefox 156.0 on macOS, first loading the existing 0.1.4
source temporarily. Its previous temporary installation had disappeared after
Firefox exited. One new, generated test chat was created for this task. No
personal chats were used for testing, and no chats were deleted.

### Reproduced failure and fix

The new live interface had neither `data-scroll-root` nor the older conversation
turn/message markers. Its scrolling element was
`.thread-scroll-container[data-app-action-timeline-scroll]`, using
`display:flex; flex-direction:column-reverse`. Still's installed marker was
present, but a programmatic `scrollTo` escaped: -5,498.45 → 0 CSS pixels.

The guard now recognizes the new viewport. On this single-content-child layout,
it uses ordinary column flow while enabled, preventing native bottom-following
as output grows. Pause restores reverse flow. The transition translates scroll
coordinates using the content's bounding rectangle to preserve the visible
passage. It also supports the new footer bottom control and observes content
resizes so its visibility can recover after layout-only growth. Existing
navigation restrictions remain in place; buttons inside new message wrappers
cannot impersonate prompt or bottom controls.

### Newly observed live behavior

- Updated guard: `scrollTo`, `scrollTop`, and passage `scrollIntoView` left
  10,068.2998046875 CSS pixels unchanged.
- Selected an ordinary passage in the generated B answer and submitted a quoted
  follow-up requesting a long C answer. Samples held scrollTop at 13,853.25 and
  the source paragraph's screen coordinate at 188.89999389648438 while content
  height grew from 17,991 to 18,935 CSS pixels.
- Clicked the native bottom button during that response. The viewport then held
  19,478.25 while content grew from 20,417 to 20,695 CSS pixels: the click did not
  enable continuous following.
- The new submitted-selection pill displayed a text preview. No source-navigation
  scroll request was observed from its preview; the paused baseline also showed
  no navigation. This build preserves source links on supported older layouts;
  it does not add a source-link feature to a preview-only site control.
- The new interface did not expose the older indexed right-hand prompt rail in
  this test chat. Its compatibility was checked in the legacy real-browser lab.

Temporary diagnostics were removed by reloading the new test chat.

### Real Firefox regression labs

`tests/modern.html`: **25/25 automated checks passed**, including new-root API
blocking, delayed requests, growth while reading and at bottom, layout-only
button recovery, pause/resume coordinate preservation, nested/unrelated panels,
and replacement of the viewport during SPA rendering. A real bottom click
followed by 600 pixels of growth held 11,830 CSS pixels. A real click on a
message button carrying misleading bottom and prompt markers stayed blocked.
Manual wheel scrolling moved the visible fixture from section 11 to section 13.

`tests/lab.html`: **28/28 automated checks passed**. Separate trusted clicks
passed compact and expanded prompt navigation, 250 ms delayed navigation,
1,200 ms expiry, immediate and delayed quotes, consumed permissions, and the
virtualized mathematical quote fixture. A later background-tab rerun timed out
waiting for native CSS smooth scrolling in the paused test; keeping the lab in
the foreground and rerunning produced 28/28 with no failures. The virtualized
test mounted the placeholder, blocked a wrong source, landed at 3,902.5 from 16,736, and blocked
another request after consumption. These fixtures contain invented data only.

JavaScript syntax checks passed. Mozilla web-ext lint: **0 errors, 0 warnings,
0 notices**. Its optional update check could not write its local configuration;
that did not affect the lint results. Packages were built with the repository's
standard-library packaging script. No permissions or network behavior changed.

### Developer Edition installation

At the user's request, installed the persistent 0.1.5 XPI in Firefox Developer
Edition 157.0, replacing 0.1.4. Add-ons Manager showed 0.1.5 enabled; its popup
showed protection on. Installed metadata reported active `app-profile`, with
neither user nor application disabling it. The installed XPI matched the build:

`ce404b55f8b2bd07c976e29ea0f6e73f806510da04142550e1a1892a395048a5`

The user explicitly waived further live testing in Developer Edition. Personal
chat tabs were left untouched and must be reloaded by the user to use the new
guard. No browser security preferences were changed and no signing submission
was made.

### Limits

This is targeted compatibility testing, not exhaustive coverage. The current
layout normalization is restricted to the observed reverse-flow viewport with
one in-flow child. Future markup, localized control names, multiple in-flow
children, content removal, and arbitrary cross-block quotations remain possible
compatibility limits. The prior one-second navigation deadline still applies.
Reports below retain their historical version-specific results.

---

# Test report — Still 0.1.4

## Virtualized and mathematical quote navigation

Verified in normal Firefox 156.0 on macOS. The user explicitly authorized
inspection of the affected project conversation. No messages were submitted,
edited, or deleted. Private chat contents and identifiers are omitted here.

The native baseline revealed two-stage navigation: an empty, non-intersecting
turn placeholder receives nearest-alignment scrollIntoView to mount the source,
then the source passage receives another request. Version 0.1.3 blocked the
placeholder. An equation-only case also contained invisible U+200B characters
in the source that were absent from the submitted quotation.

The fix permits one earlier empty placeholder and restricts the following
passage request to that same turn. It retains quote text matching, assistant-role
checks, expiry, and consumed-intent blocking. Matching ignores zero-width layout
characters. The user message may unmount between the two stages.

Live normal-Firefox checks: the mixed text/formula quotation and the equation-only
quotation both returned to their correct sources with native highlighting.
Still was loaded through about:debugging, and reloaded after the final code change;
the conversation was reloaded to remove diagnostic wrappers. This is a temporary
installation lasting until Firefox exits, not a signed persistent installation.
Firefox Developer Edition was not used or updated in this task.

The existing lab passed **28/28 checks** in normal Firefox. A separate real-click
fixture passed placeholder mounting, removal of the clicked message, rejection
of a different source, mathematical text containing an invisible separator, and
consumption of the permission: before 16,736, landing 3,902, blocked subsequent
request 16,736 CSS pixels. The fixture initially compared positions relative to
a landmark whose height changed; it was corrected to use a fixed native position.
After live quote navigation, scrollTop, scrollTo, and an unrequested passage
scrollIntoView held 2,762.35009765625 CSS pixels.
Extension lint reported zero errors, warnings, or notices.

Remaining limits: the one-second deadline and recognized markup still apply.
Multiple-placeholder loading sequences and arbitrary cross-block selections
have not been exhaustively tested. Prior reports below retain their original
version-specific results.

---

# Test report — Still 0.1.3

## Submitted-quote navigation, 21 September 2026

Tested in Firefox Developer Edition 156.0, using the existing disposable long
test chat. Personal chats were not used for testing; no chats were deleted.

Baseline: clicking the quotation above a submitted question attempted
`scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"})` on the
original assistant paragraph. Version 0.1.2 blocked it. The quote is a direct
button child of a user message, containing an icon and a clamped paragraph.

Version 0.1.3 permits one matching earlier-assistant passage alignment after a
trusted quote click, expiring after one second. It preserves the site's native
source resolution and highlight. Other scroll APIs, end alignment, unrelated
text, user-message destinations, and repeated requests remain blocked.

Firefox lab: **28/28 automated checks passed** (previous 26 plus synthetic quote
activation and passage scrolling without intent). Real UI clicks verified
immediate and 250 ms delayed quote navigation: 11,096 → 2,666 CSS pixels. The
1,200 ms expired case held 11,096. Unrelated requests before the allowed jump,
and synchronous/delayed requests after consumption, remained blocked.

Installed persistent XPI verified active, version 0.1.3, and byte-identical to
the build. Reloading the dummy chat removed diagnostic wrappers. Real clicks
on two submitted quotations returned to and highlighted the correct passages,
B03 and C08. The existing right-hand prompt menu was used successfully to reach
both quoted replies. Afterward, script attempts using `scrollTop`, `scrollTo`,
and assistant-passage `scrollIntoView` held 19,030.083984375 CSS pixels.
Extension lint reported zero errors, warnings, or notices.

Limits: live cases covered ordinary text, including bold source text. Multiblock
and mathematical quotations were not independently verified live. The quote
must match the target's DOM text or rendered text after whitespace removal and
Unicode normalization. Changed markup, unmatched text, or source mounting that
takes over one second can require a future compatibility update. Earlier test
reports below remain specific to their stated versions.

---

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
