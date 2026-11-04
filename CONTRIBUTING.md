# Contributing

Thanks for your interest in improving the Shiplog widget.

## Scope

This repo covers the client-side embed script (`widget.js`) only: rendering, accessibility, the `Shiplog.init` options, and the `open`/`close`/`toggle` API.

The `/api/widget/*` endpoints, the dashboard, and the changelog backend are part of the hosted Shiplog service and are not in this repo. If a change needs backend work, open an issue here first so it can be routed.

## Guidelines

- Keep it dependency-free and self-contained; `widget.js` is served as a single file with no build step.
- User-provided content must only flow through `textContent`, never `innerHTML`.
- Preserve accessibility behavior: `role="dialog"`, `aria-expanded`, Escape and outside-pointerdown close, `prefers-reduced-motion` support.
- Test against a live embed before submitting; the served file at `https://shiplog.cc/widget.js` is what ships.
