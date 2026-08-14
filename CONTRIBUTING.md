# Contributing

Contributions are welcome, especially improvements that preserve the project's core promises: privacy, scan reliability, accessibility, zero runtime dependencies, and a single-file distribution.

## Before opening a pull request

1. Edit files under `src/`; do not hand-edit generated `index.html`.
2. Run `npm run check`.
3. Rebuild `index.html` and include it in the commit.
4. Test QR output with at least one real phone camera/scanner when changing rendering behavior.
5. Keep runtime code free of network access and third-party dependencies.

## Coding style

- two-space indentation,
- LF line endings,
- no tabs or trailing whitespace,
- prefer browser/platform APIs over dependencies,
- escape all user-controlled strings before inserting them into HTML or SVG,
- avoid storing QR payloads or uploaded logo data,
- keep function modules scan-safe.

## Adding a QR content type

A content type normally requires:

1. an entry in `TYPES`,
2. a schema in `SCHEMAS`,
3. payload creation/validation in `buildPayload()`, and
4. at least one test or documented manual test case.

Use established URI/payload formats where possible.

## Commit / PR guidance

Keep pull requests focused and describe:

- the user-facing change,
- privacy/security impact,
- scan-compatibility impact,
- testing performed, and
- whether `index.html` was rebuilt.
