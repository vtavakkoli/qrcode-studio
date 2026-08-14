# Architecture

## Goals

QR Code Studio is designed around four constraints:

1. **Privacy:** QR payloads must not leave the browser.
2. **Portability:** the distributable application must remain one HTML file.
3. **Reliability:** styling must not unnecessarily damage QR readability.
4. **Maintainability:** contributors should not have to edit a 60k+ line-equivalent generated blob manually.

## Build model

Development source is split into four files:

- `src/template.html` — markup and security metadata,
- `src/styles.css` — UI, responsive, accessibility, and print styles,
- `src/qr-core.js` — dependency-free QR encoding,
- `src/app.js` — content types, validation, UI state, SVG generation, and export.

`scripts/build.mjs` injects these files into `src/template.html` and writes `index.html`.

The build is deterministic for a given source tree and does not install packages or access the network.

## Runtime data flow

```text
User input
   │
   ├─> schema-backed form state (memory only)
   │
   └─> payload builder + validation
          │
          └─> QRCode.encodeText()
                 │
                 ├─> numeric / alphanumeric / byte mode selection
                 ├─> UTF-8 bytes (+ ECI when byte mode needs it)
                 ├─> data/ECC codewords
                 ├─> QR matrix
                 └─> evaluate masks 0…7
                        │
                        └─> lowest-penalty matrix
                               │
                               └─> SVG renderer
                                      ├─> preview
                                      ├─> SVG download/copy
                                      ├─> Canvas → PNG
                                      └─> print
```

## Trust boundaries

### QR payload

Payload content exists in JavaScript memory and in the generated DOM/SVG preview. The application does not persist payload content and contains no network transport primitive.

### Logo files

Only PNG, JPEG, and WebP are accepted. Files are decoded with the browser image decoder, resized to at most 512 px on the longest side, and re-encoded into PNG via Canvas before embedding. This removes original metadata and avoids executing arbitrary SVG content.

### Local storage

Only visual design preferences are persisted. Forms, payloads, and logo data are excluded.

## QR robustness strategy

The renderer distinguishes between function modules and data modules. Function modules—timing, alignment, format, version information—are rendered as full square modules. The three finder patterns receive their own controlled styling. Decorative shapes are applied only to non-function data modules.

When a logo is present, High error correction is used regardless of the UI's previously selected level.

## Security headers

The standalone document contains a restrictive meta Content Security Policy, including `connect-src 'none'`. The optional container runs the same tiny Node static server used by `npm run serve` and adds equivalent HTTP security headers.

Because the product is intentionally a single HTML file, inline CSS and JavaScript are allowed by CSP. External scripts, styles, frames, objects, fonts, and connections are blocked.
