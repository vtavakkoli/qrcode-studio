## Summary

Describe the change and why it is useful.

## Privacy / security impact

- [ ] No new network access was added.
- [ ] QR payloads and logo data remain unpersisted.
- [ ] User-controlled strings are escaped before HTML/SVG insertion.

## QR reliability impact

- [ ] Function modules remain scan-safe.
- [ ] I tested generated QR codes with a real scanner/camera where relevant.

## Quality gate

- [ ] `npm run check` passes.
- [ ] `index.html` was regenerated and committed.
