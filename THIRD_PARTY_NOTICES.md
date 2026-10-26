# Third-party software

The reasoning-effort slider incorporates code from
[Microqian2th/dsh-codex-effort-slider](https://github.com/Microqian2th/dsh-codex-effort-slider),
version 1.1.2, commit `d1bb67b20bc19d44be7d7694ffca92a6f2fcbe9b`.

Copyright (c) 2026 dsh-codex-effort-slider contributors.
Distributed under the MIT License; the complete notice is included in
`licenses/dsh-codex-effort-slider.LICENSE` and in the plugin package.

`src/vendor/effort-slider.js` adapts the upstream client into an imported factory.
Liquid Glass owns registration, styles, settings listeners and their cleanup.
The adaptation scopes CSS and settings to this theme, isolates per-session level
caches, removes the global instance guard, ignores non-primary pointer buttons,
and honors the theme motion preference and the system reduced-motion setting.
The upstream continuous motion, detent calculation, gradients, particles,
directory subscriptions and native selection writeback are retained.

## Status colour wash

`src/status-motion.css` incorporates the seven SVG radial-gradient layers,
180% layer sizes, hue rotation, background-position orbit and 4000/5000 ms
periods from `packages/client/src/shared/motion.css` and
`packages/client/src/theme/tokens.json` in
[Nwflower/dsh-claude-style](https://github.com/Nwflower/dsh-claude-style),
commit `10df973b2e223b6a08990297946877be2471ddaa`.
The selectors are adapted to native active TextShimmer elements and Liquid
Glass preferences. Native status wording and accessibility remain owned by DSH.

Copyright (c) 2026 Nwflower. MIT notice: `licenses/dsh-claude-style.LICENSE`.
The recipe originates in Transitions.dev's Pro gradient text effect,
Copyright (c) 2026 Jakub Antalik / Transitions.dev.
Its terms are included in `licenses/transitions.dev.LICENSE`.

## Complete waiting line

The loader state machine, three dot lanes and their keyframes, swapping-text
helper and layout, wording lock, turn activity reader and optional phrase/tool
helpers under `src/vendor/` also incorporate the same upstream commit.
`src/wait-vendor.css` carries the loader and swap styles and the original motion
token values. Prefixes and host adapters are changed for Liquid Glass; reduced
motion and timer/animation disposal are integrated with the existing preferences.
`src/wait-line.js` supplies per-session registration, the host chat-target
subscription, native-row ownership, state copy, elapsed clock and overtime badge.
It reads DSH's `uiConversation` chat target and does not modify conversation events.
These portions are covered by the Nwflower and Transitions.dev notices above.

## dsh-context

Includes the complete published host and client bundles of [dsh-context](https://github.com/bowenliang123/dsh-context), version 0.77.0, commit 8e6555a840993a0e090dd7116d262588006e9360, by bowenliang123, under Apache-2.0. License: `licenses/dsh-context.LICENSE`. Original attribution banners are retained.

The client bundle is wrapped in a deferred factory for lifecycle ownership, and settings navigation points to the enclosing package through pluginNavigation. The integration adapter maps the upstream configuration form and settings navigation to the enclosing Super Nexusx plugin. The original cost estimator is reused from the same release source for the main-window and desktop pets. All upstream panel surfaces remain registered by the original client.
