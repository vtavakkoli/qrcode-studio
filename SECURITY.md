# Security Policy

## Supported version

Security fixes are applied to the latest version on the default branch.

## Reporting a vulnerability

Please do **not** disclose a suspected vulnerability in a public issue before a fix is available. Use the repository host's private vulnerability reporting feature when enabled, or contact the repository maintainer privately.

Include:

- affected version/commit,
- reproduction steps,
- expected and actual behavior,
- security impact,
- browser/OS details when relevant, and
- a minimal proof of concept if appropriate.

## Security expectations

QR Code Studio is a static client-side application. A report is especially useful if it demonstrates any of the following:

- QR payload or logo data leaving the browser unexpectedly,
- code execution through user-provided payload/logo content,
- bypass of the intended Content Security Policy,
- unsafe URL handling,
- malformed QR output caused by the encoder,
- persistence of sensitive content that should be memory-only, or
- a generated artifact that unexpectedly depends on remote resources.

Do not include real secrets, credentials, or personal QR payloads in reports.
