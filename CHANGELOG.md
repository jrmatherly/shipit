# [1.174.0](https://github.com/jrmatherly/shipit/compare/v1.173.2...v1.174.0) (2026-04-07)


### Features

* **web:** mcp servers editorial polish, vendor icons, and sse tool parsing ([4b4faf2](https://github.com/jrmatherly/shipit/commit/4b4faf21ce24981253910fa339d64b4e743d684c))

## [1.173.2](https://github.com/jrmatherly/shipit/compare/v1.173.1...v1.173.2) (2026-04-07)


### Bug Fixes

* **web:** mcp tools json-rpc fetch and connect instructions ([#18](https://github.com/jrmatherly/shipit/issues/18)) ([807f3a9](https://github.com/jrmatherly/shipit/commit/807f3a9157b36a9e9cf04b57d2e92a598a49227d))

## [1.173.1](https://github.com/jrmatherly/shipit/compare/v1.173.0...v1.173.1) (2026-04-07)


### Bug Fixes

* **web:** mcp servers page i18n namespace and di string token ([#17](https://github.com/jrmatherly/shipit/issues/17)) ([7d083f5](https://github.com/jrmatherly/shipit/commit/7d083f54915765f625e88e6eaf15662517ad725a))

# [1.173.0](https://github.com/jrmatherly/shipit/compare/v1.172.0...v1.173.0) (2026-04-07)


### Features

* **web:** litellm mcp server browser ([#16](https://github.com/jrmatherly/shipit/issues/16)) ([0906fd1](https://github.com/jrmatherly/shipit/commit/0906fd15f2616d2a09fda8d6a0dc69b2c1c95bbb))

# [1.172.0](https://github.com/jrmatherly/shipit/compare/v1.171.0...v1.172.0) (2026-04-06)


### Features

* **agents:** litellm multi-agent proxy routing ([#14](https://github.com/jrmatherly/shipit/issues/14)) ([b431841](https://github.com/jrmatherly/shipit/commit/b431841fd804982661364f7f9fc5933bf2ffbd7e))

# [1.171.0](https://github.com/jrmatherly/shipit/compare/v1.170.0...v1.171.0) (2026-04-06)


### Bug Fixes

* **web:** add missing sql columns and consolidate marketplace toggles ([71f894e](https://github.com/jrmatherly/shipit/commit/71f894ef5322a6c79eb33538da8be986946a7428))


### Features

* **web:** add status and source filters to tools, skills, and plugins pages ([9a7f7ad](https://github.com/jrmatherly/shipit/commit/9a7f7ade27ac74940568edf4fb0c23e862ed1516))
* **agents:** litellm proxy agent integration for claude code ([#13](https://github.com/jrmatherly/shipit/issues/13)) ([112e47d](https://github.com/jrmatherly/shipit/commit/112e47d136bbd3fa54d266376a8d214a26760fb5))

# [1.170.0](https://github.com/jrmatherly/shipit/compare/v1.169.0...v1.170.0) (2026-04-06)


### Features

* claude code plugin marketplace via litellm proxy ([#12](https://github.com/jrmatherly/shipit/issues/12)) ([6bd488f](https://github.com/jrmatherly/shipit/commit/6bd488f34f050d69a048f0e3a653ee237ea7035b))

# [1.169.0](https://github.com/jrmatherly/shipit/compare/v1.168.0...v1.169.0) (2026-04-06)


### Features

* **web:** migrate section hints to inline tooltips with editorial glass styling ([597428d](https://github.com/jrmatherly/shipit/commit/597428d90d2b867efb932f0bb2343834877ef646))

# [1.168.0](https://github.com/jrmatherly/shipit/compare/v1.167.1...v1.168.0) (2026-04-06)


### Bug Fixes

* **web:** wrap test renders in tooltip provider and fix formatting ([d7afd70](https://github.com/jrmatherly/shipit/commit/d7afd700db04e48faac2b1f1bc0103e9669e40ed))


### Features

* **web:** adopt stitch editorial design system across all pages ([97a219b](https://github.com/jrmatherly/shipit/commit/97a219be37afc314e986b3b777c1ad5f690c6835))

## [1.167.1](https://github.com/jrmatherly/shipit/compare/v1.167.0...v1.167.1) (2026-04-05)


### Bug Fixes

* **web:** keep drawer open when clicking portaled popover triggers ([bc611fd](https://github.com/jrmatherly/shipit/commit/bc611fd30d77f630e018e8b24ad23d0f20440817))

# [1.167.0](https://github.com/jrmatherly/shipit/compare/v1.166.2...v1.167.0) (2026-04-05)


### Bug Fixes

* **web:** add codeql inline suppression for 3 false-positive alerts ([ff914e6](https://github.com/jrmatherly/shipit/commit/ff914e6b9f64e3af2e5f35c7870354a39a34ceb6))


### Features

* **agents:** add onboarding wizard permission step and update docs ([c6376ae](https://github.com/jrmatherly/shipit/commit/c6376ae9e647b875eeaf94ac938230a401822084))
* **agents:** add per-agent permission modes and fix 4 latent executor bugs ([c2a098a](https://github.com/jrmatherly/shipit/commit/c2a098aa767e06c16ab9d892aecc61507cb828ba))
* **agents:** add per-feature permission override and propagate mode to all call sites ([d3a7c2c](https://github.com/jrmatherly/shipit/commit/d3a7c2c463a1ca762443027995af33ce3bf039a3))
* **web:** add permission picker ui and cli settings permissions command ([72f64fb](https://github.com/jrmatherly/shipit/commit/72f64fbd3045d303d9afb8da9930cf4ed1d33826))

## [1.166.2](https://github.com/jrmatherly/shipit/compare/v1.166.1...v1.166.2) (2026-04-05)


### Bug Fixes

* **web:** close 26 codeql alerts across web actions and api routes ([e5467f1](https://github.com/jrmatherly/shipit/commit/e5467f11217f0b8fea1376a1aa1d08efdd3b4682))
* **web:** extract path sanitizers and close directory-list toctou ([a6ac80b](https://github.com/jrmatherly/shipit/commit/a6ac80bea7e99ea36c44785debd8104f2064be9a))

## [1.166.1](https://github.com/jrmatherly/shipit/compare/v1.166.0...v1.166.1) (2026-04-05)


### Bug Fixes

* **deps:** patch ajv redos and anthropic-sdk sandbox escape advisories ([e469d7c](https://github.com/jrmatherly/shipit/commit/e469d7c71e59b2586adcf25e4f8e55377ce946f6))

# [1.166.0](https://github.com/jrmatherly/shipit/compare/v1.165.0...v1.166.0) (2026-04-05)


### Bug Fixes

* **dx:** normalize tsp output.ts in validate script ([bf44c27](https://github.com/jrmatherly/shipit/commit/bf44c27e512d301c508b02283e16821c0305284b))


### Features

* **agents:** add github copilot cli and rovo dev cli as supported agents ([8a5d7b0](https://github.com/jrmatherly/shipit/commit/8a5d7b047b51f6822140950ff82362b9a32799a6))
* **deps:** upgrade lucide-react from 0.563 to 1.7.0 ([28c8082](https://github.com/jrmatherly/shipit/commit/28c8082017a78df33b1350851022708b59b1e356))

# [1.165.0](https://github.com/jrmatherly/shipit/compare/v1.164.2...v1.165.0) (2026-04-04)


### Bug Fixes

* **web:** rename middleware.ts to proxy.ts per next.js deprecation ([055630c](https://github.com/jrmatherly/shipit/commit/055630cc60a849714d6c593bb74a6dae9021acbd))
* **web:** replace logo, fix sse di error, fix pre-existing type errors ([05e4c78](https://github.com/jrmatherly/shipit/commit/05e4c78751ea39a9f1fa8545baf7a415080b4c9d))
* **web:** replace remaining shep references and hide empty features section ([56266f0](https://github.com/jrmatherly/shipit/commit/56266f059435a25b46b359162f0d16747c97f10b))


### Features

* **web:** add agent availability badges and fix oauth auth detection ([70232f9](https://github.com/jrmatherly/shipit/commit/70232f9997df5d389641b0564ed4d7f46d48fd72))
* **web:** standardize brand name to shipit across all ui and prompts ([374a7cf](https://github.com/jrmatherly/shipit/commit/374a7cfe79f65c2000f53a889bdb4e4fb313d058))

## [1.164.2](https://github.com/jrmatherly/shipit/compare/v1.164.1...v1.164.2) (2026-04-03)

### Bug Fixes

- **ci:** use node 24 for publish jobs instead of npm upgrade ([473bbc3](https://github.com/jrmatherly/shipit/commit/473bbc373a79e64ecb2d573719e43d249ad3cf5e))

# Changelog

All notable changes to this project will be documented in this file.

This project was forked from [shep-ai/shep](https://github.com/shep-ai/shep) at v1.164.1
and rebranded as [jrmatherly/shipit](https://github.com/jrmatherly/shipit) (`@shipit-ai/cli`).

Previous changelog entries can be found in the upstream repository.

Releases from this fork are auto-generated by [semantic-release](https://semantic-release.gitbook.io/) and will appear below as versions are published.
