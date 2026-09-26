# Personal testing in Firefox Developer Edition

This setup uses an unsigned local extension. Nothing is submitted to Mozilla's
Add-ons service; this does not require an Add-ons listing or its distribution agreement.
Firefox itself has its own browser terms shown on first launch.

## Install once

1. Install [Firefox Developer Edition](https://www.firefox.com/en-US/channel/desktop/developer/)
   alongside ordinary Firefox. Keep its separate profile.
2. In Developer Edition, open `about:config` and find
   `xpinstall.signatures.required`. Set it to `false`.
3. Open `about:addons`. In the gear menu, select **Install Add-on From File…**.
4. Build with `python3 scripts/package.py` from the repository root. Select
   `dist/still-0.1.6-unsigned.xpi`, then confirm installation and access to
   `chatgpt.com`.
5. Open a new ChatGPT tab. Sign in normally if needed: the separate profile does
   not inherit your other Firefox's login.

Use the ordinary add-on installer in step 3, not **Load Temporary Add-on**. The
ordinary installation remains enabled after quitting and reopening the browser.

The signature preference permits unsigned extensions throughout this Developer
Edition profile. It does not change ordinary Firefox's signature enforcement.

## Use Still

Still blocks automatic conversation scrolling. Manual scrolling and ChatGPT's
existing down-arrow button and right-hand prompt navigator continue to work.
Open Firefox's Extensions menu →
**Still — Manual Scroll for ChatGPT** to pause or resume protection.

Reload open ChatGPT tabs after installing, updating, or removing the extension.
While paused, the page's normal scrolling functions are allowed again.

## Update or remove

For a new local version, install its XPI through the same gear menu, then reload
ChatGPT. No update server is configured for this personal build.

To remove it, use `about:addons`. If you stop using unsigned extensions, restore
`xpinstall.signatures.required` to `true` in Developer Edition.

## References

- [Mozilla: signature requirements and supported developer editions](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- [Mozilla: installing extensions from a file](https://extensionworkshop.com/documentation/publish/self-distribution/)
