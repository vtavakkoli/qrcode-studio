# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog conventions and the project uses semantic versioning for releases.

## [2.1.0] - 2026-08-14

### Added

- Native dependency-free Code 128-B barcode encoder with modulo-103 checksum generation.
- Genuine linear barcode SVG rendering, quiet zones, human-readable text, PNG/SVG export, and printing.
- Barcode-specific automated tests covering symbol sequence, checksum stability, input validation, and standalone SVG safety.
- Pink product theme with accessible focus treatment and barcode-aware responsive layout.
- Dedicated barcode documentation and updated architecture/repository guidance.

### Changed

- Renamed the former `2D Data` option to `Barcode`.
- Barcode content is no longer passed to the QR encoder.
- QR-only controls (shape, logo, ECC, QR quiet-zone setting) are hidden while Barcode mode is active.
- Preview headings, download actions, metadata, status messages, and export filenames adapt automatically between QR and barcode modes.
- Package version and quality gate updated for the new barcode engine.

### Fixed

- Prevented users from receiving a QR code when they explicitly select barcode generation.
- Removed the green product accent in favor of the requested pink visual identity.

## [2.0.0] - 2026-08-14

### Added

- Maintainable source/build structure while preserving a single-file `index.html` distribution.
- Automatic selection of the lowest-penalty QR mask from all eight legal masks.
- Numeric/alphanumeric mode optimization before falling back to byte mode.
- UTF-8 ECI signaling for non-ASCII content.
- Location (`geo:`) QR payloads.
- Expanded vCard fields and safer iCalendar payload generation.
- Form validation and URL normalization.
- Scan-quality/contrast feedback.
- Custom call-to-action frame text.
- Local logo sanitization by raster decode/re-encode.
- Drag-and-drop logo upload.
- 4096 px PNG export, SVG clipboard copy, and print support.
- Keyboard-accessible design tabs and improved responsive/accessibility behavior.
- Content Security Policy and no-referrer policy.
- Dependency-free build, lint, tests, local server, Docker image, CI, and release workflow.
- Project documentation, contribution guide, security policy, notice, and issue templates.

### Changed

- Structural QR function modules remain square for improved scan robustness with rounded/dot styling.
- Uploaded logos automatically force High error correction.
- Only design preferences are persisted; QR payloads and logo data remain memory-only.

### Fixed

- QR codes no longer use mask pattern 0 unconditionally.
- Non-ASCII byte payloads now advertise UTF-8 encoding using ECI.
- URL-based QR types reject invalid/non-HTTP(S) URLs.
- Event end time is validated against start time.

## [1.0.0]

- Initial standalone QR generator.
