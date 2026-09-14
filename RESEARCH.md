# Research informing the design

Sources checked on 14 September 2026. Claims by other extension authors describe
their products; they are not evidence that those products work reliably.

- A [ChatGPT user report from August 2026](https://www.reddit.com/r/ChatGPT/comments/1vggp7n/please_add_an_option_to_stop_chatgpt_from/)
  describes losing the reading position after sending another message.
- The [OpenAI Community streaming-scroll report](https://community.openai.com/t/screen-auto-scrolls-as-the-response-being-generated/782378)
  records difficulty reading while the page moves during generation.
- [Anchor's author](https://www.reddit.com/r/chrome_extensions/comments/1vfil5q/built_a_chrome_extension_that_stops_chatgpt_and/)
  describes preserving position above the bottom and restoring normal behavior
  on reaching it. Still's intended behavior is stricter: reaching the bottom
  does not re-enable automatic following. Anchor's source was not audited, and
  no specific cause is asserted for the user's unsuccessful experience with it.
- The [open-source AI chat auto-scroll blocker README](https://github.com/FrankLong1/open-source-ai-chat-auto-scroll-blocker)
  describes overriding native scroll functions and allowing an initial scroll.
  Its author explicitly documents a resulting new-chat edge case. Still does
  not include a “first scroll is allowed” exception. No third-party extension
  source was copied into this project.
- A [userscript concerning ChatGPT virtualization](https://gist.github.com/ivan/e51b8d7e7512d412f22967d3b53aa052)
  identifies long-conversation DOM changes as a separate concern. Still does not
  disable ChatGPT's virtualization or fetch older messages through private APIs.

Primary technical references:

- [MDN: content_scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts)
  documents `document_start` and MAIN vs ISOLATED execution worlds.
- [MDN browser compatibility data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/webextensions/manifest/content_scripts.json)
  lists Firefox 128 support for the manifest's `world` key. This package chooses
  a later minimum to support its current data-collection declaration cleanly.
- [MDN: browser_specific_settings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)
  documents the extension ID and explicit `none` data-collection declaration.
- [MDN: focus](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus)
  documents `preventScroll`; [scrollTop](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop)
  documents direct position access.
- [Mozilla signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
  explains why normal public installation requires a signed package.
