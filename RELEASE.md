# Release preparation

Status: experimental source version 0.1.2, maintained on GitHub.
No Mozilla Add-ons listing or signing request has been made. Review the test
report and README disclaimers before any broader distribution.

## Proposed Mozilla Add-ons listing

**Name:** Still — Manual Scroll for ChatGPT

**Summary:** Stop ChatGPT from moving the conversation while you read. Keep
manual scrolling and the existing jump-to-bottom button.

**Description:**

Read long ChatGPT answers at your own pace. Send a follow-up or quote a point in
an earlier answer while keeping your place in the conversation.

Still blocks ChatGPT's automatic conversation scrolling. You can still scroll
with the mouse, trackpad, scrollbar, or keyboard. The existing down-arrow button
jumps to the current bottom once, without switching automatic following back on.

Pause or resume from the Firefox toolbar. Your choice is saved locally.

Free and open source under the MIT license. No subscriptions, trials, date
restrictions, data collection, external accounts, or tracking. Only runs on
chatgpt.com. Independently developed; not affiliated with OpenAI.

ChatGPT can change its interface, so compatibility may require updates. See the
source and test report for the version's tested behavior and current limitations.

**License:** MIT

**Data collection:** None

**Platforms:** Desktop Firefox 142+

## Submission steps

1. Review the source, test evidence, public name, and version.
2. Choose a public source repository and contact details. Do not publish private
   test chat URLs, account information, or personal browsing screenshots.
3. Build the extension ZIP containing only the contents of `extension/` plus
   the MIT license. Run Mozilla's validator.
4. Sign in to the [AMO Developer Hub](https://addons.mozilla.org/developers/).
   The account owner must review any legal agreement.
5. Submit the ZIP as a **listed** add-on, use the prepared description and privacy
   policy, attach suitable screenshots, and select desktop platforms.
6. Explain to the reviewer that MAIN-world code wraps page scrolling functions
   at document start. There are no build steps, vendored libraries, obfuscation,
   network calls, or remote code; the package is its own readable source.
7. Once Mozilla signs/publishes it, verify the signed XPI in a clean profile and
   repeat the real ChatGPT quote and bottom-button smoke tests.
8. Share the public Add-ons URL for normal installation and automatic updates.

Alternatively, Mozilla can sign an **unlisted** XPI for self-distribution. It
still requires signing; updates then need a separately configured distribution
mechanism. Public installation in standard Firefox should use a signed package.

For personal testing, a separate Firefox Developer Edition profile can permit
unsigned extensions. The unsigned XPI can be installed persistently there without
a signing submission. See README.md for the setting and its implications.

References: [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/),
[signing overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).
