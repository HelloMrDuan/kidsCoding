# Scratch VM first runtime experiment

- URL: `/learn/scratch-lab/G3-U1-L02`
- Uses actual official Scratch 3 VirtualMachine loaded from pinned `scratch-vm@5.0.300` browser bundle. This runtime lives inside a sandboxed opaque-origin iframe.
- The trusted original `meteor-clones.sb3` is checked into `apps/web/public/scratch-samples`, with two original SVG costumes and clone blocks.
- The parent only renders a lightweight visual projection of authentic VM target positions. This is **not** the Scratch renderer, and is not a general Scratch project editor.
- Browser E2E must prove `loadProject`, `greenFlag`, clone creation, y-coordinate movement, and `stopAll`; it must not use route interception or fabricated VM target data.
- External jsDelivr dependency + AGPL-3.0-only package obligations need review and self-hosting before wide public release.
- No user files or grades; not marked as released lesson.
