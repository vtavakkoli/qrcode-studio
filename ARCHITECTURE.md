# Architecture

## Goals

QR Code Studio is designed around five constraints:

1. **Privacy:** QR and barcode payloads must not leave the browser.
2. **Portability:** the distributable application must remain one HTML file.
3. **Reliability:** styling must not unnecessarily damage QR or barcode readability.
4. **Maintainability:** contributors should edit modular source files instead of the generated standalone artifact.
5. **Separation of symbologies:** selecting Barcode must use a barcode encoder, never the QR encoder.

## Build model

Development source is split into focused files:

- `src/template.html` — markup and security metadata,
- `src/styles.css` — base UI, responsive, accessibility, and print styles,
- `src/theme-pink.css` — pink product identity and barcode-mode layout overrides,
- `src/qr-core.js` — dependency-free QR encoding,
- `src/barcode-core.js` — dependency-free Code 128-B encoding and SVG rendering,
- `src/app.js` — QR content types, validation, UI state, SVG generation, and export,
- `src/enhancements.js` — barcode-mode integration and adaptive UI labels.

`scripts/build.mjs` injects all trusted local source files into `src/template.html` and writes `index.html`.

The build is deterministic for a given source tree and does not install packages or access the network.

## Runtime data flow

```text
User input
   │
   ├─> schema-backed form state (memory only)
   │
   └─> type dispatch
          │
          ├─> QR content
          │      └─> payload builder + validation
          │             └─> QRCode.encodeText()
          │                    ├─> mode selection
          │                    ├─> UTF-8 / ECI handling
          │                    ├─> data/ECC codewords
          │                    ├─> QR matrix
          │                    └─> evaluate masks 0…7
          │                           └─> lowest-penalty matrix
          │                                  └─> styled SVG
          │
          └─> Barcode content
                 └─> printable-ASCII validation
                        └─> Barcode128.encode()
                               ├─> Start B
                               ├─> data symbols
                               ├─> modulo-103 checksum
                               ├─> Stop symbol
                               └─> width patterns
                                      └─> linear SVG

SVG output
   ├─> preview
   ├─> SVG download/copy
   ├─> Canvas → PNG
   └─> print
```

## Trust boundaries

### QR and barcode payloads

Payload content exists in JavaScript memory and in the generated DOM/SVG preview. The application does not persist payload content and contains no network transport primitive.

### Logo files

Only PNG, JPEG, and WebP are accepted. Files are decoded with the browser image decoder, resized to at most 512 px on the longest side, and re-encoded into PNG via Canvas before embedding. This removes original metadata and avoids executing arbitrary SVG content. Logos are a QR-only feature and are hidden in Barcode mode.

### Local storage

Only visual design preferences are persisted. Forms, payloads, and logo data are excluded.

## QR robustness strategy

The QR renderer distinguishes between function modules and data modules. Function modules—timing, alignment, format, version information—are rendered as full square modules. The three finder patterns receive controlled styling. Decorative shapes are applied only to non-function data modules.

When a logo is present, High error correction is used regardless of the UI's previously selected level.

## Barcode robustness strategy

Barcode mode uses Code 128-B and generates the required Start B symbol, data symbols, modulo-103 checksum, and stop pattern. The renderer keeps quiet zones around the linear symbol and includes human-readable text. QR-only controls such as finder styling, ECC, and logo placement are hidden while Barcode mode is active.

Barcode input is capped at 120 printable ASCII characters to prevent extremely wide, impractical output.

## Security headers

The standalone document contains a restrictive meta Content Security Policy, including `connect-src 'none'`. The optional container runs the same tiny Node static server used by `npm run serve` and adds equivalent HTTP security headers.

Because the product is intentionally a single HTML file, inline CSS and JavaScript are allowed by CSP. External scripts, styles, frames, objects, fonts, and connections are blocked.

## Quality gate

`npm run check` rebuilds the standalone application, validates JavaScript syntax, runs repository/security lint rules, executes QR tests, executes Code 128 tests, and verifies that the generated HTML remains self-contained.
