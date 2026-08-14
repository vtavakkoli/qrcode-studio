# Testing Guide

## Automated quality gate

Run:

```bash
npm run check
```

The quality gate rebuilds `index.html`, checks source and generated JavaScript syntax, enforces repository privacy/security invariants, and runs QR encoder test vectors.

## QR encoder coverage

The built-in tests cover:

- version/size invariants,
- all eight fixed QR masks,
- automatic lowest-penalty mask selection,
- numeric/alphanumeric/byte mode selection,
- a known QR matrix test vector,
- UTF-8 content,
- error-correction/version growth,
- oversized payload rejection, and
- function-module matrix integrity.

## Recommended manual browser smoke test

Before a release, verify at least:

1. Link QR — plain domain normalization (`example.com` → HTTPS).
2. Text QR — ASCII and mixed Unicode/emoji.
3. E-mail — recipient + subject + multi-line message.
4. Wi-Fi — WPA network, open network, escaped punctuation.
5. V-card — name, phone, e-mail, URL, address.
6. Event — start/end time and description.
7. Location — positive/negative coordinates.
8. Square, rounded, and dot styles.
9. Foreground/background contrast warning.
10. Logo upload, drag/drop, removal, and High ECC override.
11. PNG and SVG downloads.
12. Print layout.
13. Desktop and narrow mobile viewport.
14. Keyboard tab navigation and visible focus indicators.
15. Run from both `file://` and a static HTTP server.

## Scanner compatibility

For any change to QR rendering, scan generated output with multiple independent readers where possible:

- native iOS camera,
- native Android/Pixel camera,
- a Chromium-based QR reader or browser BarcodeDetector implementation,
- a desktop decoder such as OpenCV/ZBar for regression checks.

Always test the final physical print for production deployments because print scale, ink spread, paper texture, reflections, and camera distance can affect readability.

## Security checks

Confirm that:

- browser DevTools Network remains empty after loading a local `index.html`,
- no payload data is written to Local Storage,
- uploaded logos are stored only in memory,
- invalid `javascript:` URLs are rejected,
- external scripts/styles are absent from the generated artifact, and
- the CSP retains `connect-src 'none'`.
