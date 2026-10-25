# Changelog

All notable changes to Ants vs Marbles are recorded here. Versions follow
[Semantic Versioning](https://semver.org/). The build number shown in the game
is the git commit count, so it increases automatically with every commit.

To cut a release, add notes under **Unreleased**, rename that heading to the new
version, then run `npm run release:patch` (or `release:minor` / `release:major`).

## [Unreleased]

## [1.1.0]

### Added

- Sandbox mode: infinite crumbs, no cooldowns, every marble and tool, and spawn buttons for every ant. No waves arrive on their own and the game cannot be won or lost.
- Version number and build number shown below the game.
- This changelog, plus links to it and the GitHub repository.

### Changed

- Main menu buttons re-spaced to fit the new Sandbox entry.

## [1.0.0]

### Added

- Retina rendering and a guided tutorial.
- Compact layout for landscape phones and tablets.
- Canvas scaling for the display and a tidier board layout.
- Debug mode.
- Automatic deployment to the live site from `master`.

### Fixed

- Input, feedback and debug-mode bugs found in code review.
- Hover, keyboard and interruption handling.

[Unreleased]: https://github.com/jonknibbs/PVZ-clone/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/jonknibbs/PVZ-clone/compare/18633de...v1.1.0
[1.0.0]: https://github.com/jonknibbs/PVZ-clone/tree/18633de
