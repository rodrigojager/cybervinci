# CyberVinci Product Shell

This package owns the CyberVinci product boundary that should remain stable while Theia and vendored product extensions move forward.

It deliberately does not depend on Memory, Documentation Manager, Arena, OpenPencil, or provider packages. Feature packages depend on this shell only for shared product menu paths and product contract metadata.

The product shell tracks:

- top-level CyberVinci menu ownership;
- product feature package inventory;
- Theia core patch boundaries that still need special care during upgrades;
- regression gates required before accepting a Theia, OpenPencil, or branding update.

See `docs/cybervinci-update-strategy.md` for the broader upgrade workflow and patch matrix.
