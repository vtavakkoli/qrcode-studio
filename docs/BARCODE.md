# Barcode mode

QR Code Studio includes a native, dependency-free **Code 128-B** barcode generator. Barcode mode is intentionally separate from QR generation: selecting **Barcode** never calls the QR encoder.

## Why Code 128-B

Code 128 provides dense linear barcodes for identifiers, inventory values, order references, asset tags, and other printable ASCII data. Code Set B covers printable ASCII characters from space (`0x20`) through tilde (`0x7E`), which is a practical default for a small offline generator.

## Encoding pipeline

```text
input
  └─> printable-ASCII validation
      └─> Start B symbol (104)
          └─> data code values
              └─> modulo-103 checksum
                  └─> Stop symbol (106)
                      └─> width pattern expansion
                          └─> SVG bars + human-readable text
```

The implementation lives in `src/barcode-core.js` and has no external dependencies.

## Reliability rules

- Use a dark foreground on a light background.
- Keep the symbol horizontally unobstructed.
- The renderer includes quiet zones around the barcode.
- Barcode mode does not permit a center logo or rounded/dotted bars.
- Input is capped at 120 characters to avoid impractically wide output.
- PNG export keeps image smoothing disabled so bar edges remain crisp.

## Current scope

Supported:

- Code 128-B
- printable ASCII
- modulo-103 checksum
- SVG/PNG export
- print output
- optional border/call-to-action frame
- custom foreground/background colors

Not yet included:

- automatic Code Set A/B/C switching
- GS1-128/FNC1
- EAN-13, UPC-A, Code 39, ITF, PDF417, Data Matrix, or Aztec

Those symbologies can be added later behind the same `Barcode128`-style core interface without introducing runtime dependencies.

## Testing

Run:

```bash
npm run check
```

The barcode test suite verifies known symbol/checksum vectors, unsupported-character rejection, maximum-length validation, and SVG generation.
