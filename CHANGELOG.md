# 1.0.0 (2026-04-03)


### Bug Fixes

* **web:** add api path containment, auth middleware, and dep patches ([26174e3](https://github.com/jrmatherly/shipit/commit/26174e38de27bc18da47366af0cf681a9641c8d9))
* **web:** convert sse notification timestamps from string to date ([4ddb311](https://github.com/jrmatherly/shipit/commit/4ddb311e3199890a25389f6ea6e9537e7a25d2eb))
* **ci:** fix sse integration test, daemon regex, and workflow emojis ([ad9f6bc](https://github.com/jrmatherly/shipit/commit/ad9f6bceaf18c8363dad5c0f79f4282595bd58cb))
* **deps:** include lockfile update for typespec emitter patch ([4626c3d](https://github.com/jrmatherly/shipit/commit/4626c3dc58999e63e7a19c304059abc923acc5e2))
* **ci:** make slack webhook optional and cancel stale workflow runs ([b055cb6](https://github.com/jrmatherly/shipit/commit/b055cb6999c223a43a2c9f2f14af972bb352702f))
* **tsp:** patch emitter to map utcdatetime to date instead of any ([d58cf5f](https://github.com/jrmatherly/shipit/commit/d58cf5f1da33f1cc6bc9ce0224141f9649e48c4c))
* **tsp:** recreate typespec emitter patch using pnpm patch workflow ([23e2117](https://github.com/jrmatherly/shipit/commit/23e211769093bc252c5af2b12e812773aadd3e16))
* **dx:** replace grep -p with posix-compatible patterns in mock hook ([fad3f46](https://github.com/jrmatherly/shipit/commit/fad3f465c8f9b330297f6d453fdeff4d7fec7594))


### Features

* **web:** add aria-describedby linking for form error messages ([0828604](https://github.com/jrmatherly/shipit/commit/08286048e8d33827f2d652fa07cd9e94ef8f5b44))
* **web:** add focus trapping and escape dismiss to non-modal drawers ([e270a01](https://github.com/jrmatherly/shipit/commit/e270a012735dd60c7c3a71cf69303d268ebd092b))
* implement extensive feature lifecycle management, CLI tools, UI components, and supporting documentation ([b685736](https://github.com/jrmatherly/shipit/commit/b685736cc3d7c40040ad111a7c0f0cdcf2f295d5))


### Performance Improvements

* **web:** batch sse queries, cap stderr, fix error leakage, add a11y ([6848b7c](https://github.com/jrmatherly/shipit/commit/6848b7c551317f1d68352a188da8cce4a7f0f342))

# Changelog

All notable changes to this project will be documented in this file.

This project was forked from [shep-ai/shep](https://github.com/shep-ai/shep) at v1.164.1
and rebranded as [jrmatherly/shipit](https://github.com/jrmatherly/shipit) (`@shipit-ai/cli`).

Previous changelog entries can be found in the upstream repository.
