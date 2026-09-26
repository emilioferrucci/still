# Privacy

Still does not collect, transmit, sell, or analyze personal data.

The extension stores one boolean preference (`enabled`) in Firefox's local
extension storage. It is not synced to an external service by the extension.

On chatgpt.com, Still identifies the conversation's scrolling element and bottom
button from the page structure and uses scroll geometry to perform an intentional
jump to the bottom. For supported quote-source navigation, it transiently reads
the clicked quotation and candidate passage text in page memory to restrict the
allowed destination. It does not persist or transmit that text or copy chats.
It has no analytics, remote requests, tracking, account system, or remote
executable code.

The optional development lab and temporary diagnostics used during testing are
not included in the extension package.
