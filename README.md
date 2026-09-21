# Still — Manual Scroll for ChatGPT

A small, free, MIT-licensed Firefox extension that stops ChatGPT's scripts from
moving the conversation while you read. No accounts, trials, paid features,
telemetry, remote code, or runtime dependencies. Independent of OpenAI.

**Experimental, agent-written software. Use entirely at your own risk.**

## Disclaimers — read before installing

- **Written by a coding agent.** An OpenAI coding agent generated the code,
  documentation, and test tooling, and operated the browser during the recorded
  tests. Publishing this repository does not mean Emilio Ferrucci has personally
  reviewed, understood, or verified every line. No independent security audit or
  comprehensive human code review is claimed.
- **No responsibility accepted, to the fullest extent permitted by law.**
  Emilio Ferrucci and the project's authors, copyright holders, maintainers,
  and contributors accept no responsibility or liability for your installation,
  use, modification, or redistribution of this software, or for resulting
  claims, losses, damages, or other consequences. The full MIT license's
  warranty and liability disclaimer applies; see [LICENSE](LICENSE).
- **Provided “AS IS” and “AS AVAILABLE”, without warranties.** There is no
  promise of correctness, security, reliability, fitness for a particular
  purpose, non-infringement, accessibility, or compatibility with your setup.
  Nothing here excludes obligations or liability that cannot legally be excluded.
- **You decide whether to trust and run it.** Review the source and permissions
  yourself. Test in a separate browser profile before relying on it. Potential
  consequences include broken page interactions, unexpected scrolling, lost
  reading position or unsaved work, browser instability, and other unintended
  effects. These examples are not exhaustive.
- **Tests are limited evidence.** Recorded tests passed in particular browser
  versions and interface states. They do not guarantee that every immediate,
  delayed, or intermittent scroll is blocked, or that the software is safe or
  free of defects. See [TESTING.md](TESTING.md) for observed results and limits.
- **ChatGPT can change at any time.** Still modifies page scrolling functions
  and depends on ChatGPT's page structure. Changes to the site, browser, or
  other extensions may break protection or manual controls without notice.
  Layout changes and content removal can still move what appears on screen.
  Reading positions are not saved across reloads.
- **No support or maintenance commitment.** No response time, fixes, updates,
  ongoing development, or suitability for continued use is promised. You may
  need to pause, remove, or modify the extension yourself.
- **Unsigned development build.** This repository is not a Mozilla Add-ons
  approval or certification. Disabling signature enforcement permits other
  unsigned extensions in that profile too. Standard Firefox's temporary
  installation remains available without changing its signature setting.
- **No affiliation or endorsement.** This is an independent personal project,
  not an official OpenAI, ChatGPT, Mozilla, or Firefox product. Those names
  identify compatibility and development context only.
- **Privacy statements describe this source version.** Still contains no
  telemetry or network requests. It does not make ChatGPT, Firefox, other
  extensions, or modified copies private. Verify the copy you install.

## Intended behavior

- Automatic conversation scrolling is blocked, including when you send a prompt
  or quote an earlier answer. Protection stays on even at the bottom.
- Wheel/trackpad, scrollbar, keyboard scrolling, text selection, and Firefox Find
  remain browser-controlled.
- ChatGPT's existing down-arrow button jumps to the current bottom **once**.
  New output after that does not automatically follow.
- ChatGPT's right-hand prompt-navigation rail and expanded prompt menu allow
  deliberate jumps to earlier or later prompts and their answers.
- Clicking the submitted quotation above a question returns to its original
  assistant passage, preserving ChatGPT's highlight.
- The toolbar popup pauses/resumes protection. The setting is stored locally.
- Only `https://chatgpt.com/` is in scope. Nested editors, code panels, and other
  independently scrolling panels keep their normal scrolling methods.

Firefox **142 or later** on desktop is required. Tested versions and limitations
are recorded in [TESTING.md](TESTING.md).

## Try the development version

This source package is **unsigned**. Temporary installation lasts until Firefox
restarts; it is not the permanent, public installation method.

1. Download this repository with GitHub's **Code → Download ZIP** and extract it,
   or clone it with Git.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…** and select `extension/manifest.json`.
4. Open a **new ChatGPT tab**, or reload a chat you want to use it in.
5. Open Firefox's Extensions menu, then **Still**, to pause or resume it.

Reload a ChatGPT tab after removing the extension to remove its page-world
wrappers. Pausing it from the popup makes the wrappers pass calls through.
Reload after an extension update to use its newest code. Repeated injection
into the same document is guarded against, so wrappers do not stack.

The development build used during recorded live tests was restricted to newly
created test chats. The manifest in this folder applies to ChatGPT generally.

## Permanent installation and public release

Release Firefox requires Mozilla signing. A ZIP produced locally is **not** a
signed XPI, and renaming it does not make it permanently installable in standard
release Firefox.

For personal testing, **Firefox Developer Edition** supports persistent unsigned
installation. Use its separate profile, set `xpinstall.signatures.required` to
`false` in `about:config`, then open `about:addons` and choose the gear menu →
**Install Add-on From File…** → `dist/still-0.1.4-unsigned.xpi` (build it below).
Confirm the requested
ChatGPT access. This installation survives restarts; no Mozilla signing submission
or public listing is involved. The preference permits other unsigned extensions
in that profile too, so keep this change confined to Developer Edition.

The unsigned XPI and ZIP contain identical bytes. The XPI suffix lets Firefox's
normal file installer recognize the package; it does not add a signature.

Developer Edition is a separate Firefox application that can run alongside
ordinary Firefox. Open ChatGPT in Developer Edition and sign in with your normal
account; the separate profile does not inherit your other Firefox's login. Still
is enabled by default. See [LOCAL-INSTALL.md](LOCAL-INSTALL.md) for details.

The simplest public distribution path is a free Mozilla Add-ons listing. Submit
the extension ZIP through the [Mozilla Add-ons Developer Hub](https://addons.mozilla.org/developers/).
Mozilla validates and signs it; once published, users install through the listing
and Firefox handles updates. No browser security settings need changing.

See [RELEASE.md](RELEASE.md) for the prepared release steps and listing text.
No listing has been submitted or published as part of this local development.

## How it works

`guard.js` runs at `document_start` in the page's MAIN JavaScript world. It wraps
the conversation's scrolling APIs (`scrollIntoView`, `scrollTo`, `scrollBy`,
`scroll`, and the `scrollTop` setter), plus `focus({preventScroll:true})` where
focus could scroll the conversation. It uses the current `data-scroll-root`
element, with a fallback for older conversation layouts.

The native bottom button is recognized by its dedicated footer wrapper, with
accessible-name fallbacks for older layouts. A real click calls a private saved
native scrolling function directly. This avoids a permissive interval after
every user click, during which unrelated automatic scrolling could slip through.
There is no polling loop that repeatedly drags your viewport back.

ChatGPT can hide its bottom button after assuming that an automatic jump
succeeded. Still repairs the site's `data-scroll-from-end` presentation flag
from the actual distance to the bottom (48 CSS pixels). DOM changes, scrolling,
resizes, and resource loads schedule a coalesced animation-frame check. This
keeps the native arrow/streaming-dots control available without moving the page;
these repairs stop while Still is paused.

The prompt navigator uses a separate, single-use exception: a trusted click on
its rail or menu permits one `scrollIntoView` alignment to the start of a user
message. Other scrolling APIs remain blocked. The permission expires after one
second if unused and is cancelled by another manual gesture. This lets ChatGPT
render its selected target without a general period of unrestricted scrolling.
If a future interface uses another navigation mechanism, or target rendering
takes longer than that limit, this control may need another compatibility fix.

Submitted quote buttons have a separate single-use exception. A trusted click
permits nearest-alignment `scrollIntoView` within an earlier assistant
message whose target text contains the quotation (ignoring whitespace and
normalizing Unicode, including invisible math spacing). If the answer is
virtualized, one preceding empty turn placeholder may first scroll into view
to load it; the final passage jump is then restricted to that exact turn.
The same one-second expiry and manual-gesture cancellation
apply. Quote text stays in page memory briefly; it is not persisted or sent
anywhere. Unrecognized markup or quote text that does not match the rendered
source remains blocked rather than opening a general scrolling exception.

`settings.js` runs in Firefox's isolated extension world and passes only an on/off
value to the guard. There is no message channel that gives the website extension
API access. Page code can interfere with MAIN-world scripts; this extension is a
usability tool, not a security boundary.

## Development

The source is plain JavaScript and needs no compilation. From the repository
root, use Python 3.9 or later to build the packages:

```sh
python3 scripts/package.py
```

This uses Python's standard library and writes an unsigned ZIP, an unsigned XPI,
a source archive, and `SHA256SUMS.txt` to `dist/`. Nothing is uploaded. To choose
another directory, use `python3 scripts/package.py --output /path/to/output`.

Optional validation with Mozilla's development tool:

```sh
npx --yes web-ext@10.6.0 lint --source-dir extension
```

This optional command downloads the specified tool and its dependencies from npm.
It does not sign or publish anything. The extension has no runtime dependency on
Node, npm, or Python.

The local browser regression page is `tests/lab.html`. It deliberately attempts
automatic scrolling and includes controls for manual gesture stress testing.
The lab loads the actual `guard.js` source; it has no network dependencies and
contains only generated test text. Do not package `tests/` inside the extension.

## Permissions and privacy

The only API permission is `storage`, used for the on/off preference. Host access
is limited to `chatgpt.com` because page code must be intercepted there. The
extension uses element structure and scroll geometry; it does not read message
text, copy chats, make network requests, or record browsing history. Its manifest
declares no data collection. See [PRIVACY.md](PRIVACY.md).

If reporting a problem, provide the browser version and reproduction steps using
disposable text. Do not publish private chats, account details, cookies, or tokens.

Copyright © 2026 Emilio Ferrucci. [MIT license](LICENSE).
