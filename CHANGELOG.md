# Changelog

All notable changes to the Sticks Lite interpreter and CLI are recorded here.

Sticks Lite follows semver-style package versions for the published npm
package. The project is intended for monitored educational environments and is
not a production application runtime or security sandbox.

## 1.0.27

Administrative hardening release before the 1.1 series.

### Added

- Added this changelog for public release history.
- Added `CONTRIBUTING.md` with contributor workflow, safety expectations, and
  testing requirements.
- Added `RELEASE.md` with a formal release checklist.
- Added README links to the public documentation, API reference, CLI reference,
  classroom guidance, changelog, support, security, and release process.

### Changed

- Reworked the README into a more scannable structure with quick links, command
  tables, verification instructions, and clearer release/admin pointers.
- Tightened repository consistency checks so required public administration
  files stay present.
- Updated issue template wording to prefer `sticks run main.slite`.

### Verified

- Release checks run tests, build, production dependency audit, docs build,
  browser IDE build, VS Code extension metadata validation, and npm package
  dry run.

## 1.0.26

Documentation and organization cleanup.

- Added docs coverage for testing and release checks.
- Cleaned version-update checklist wording.
- Kept repository docs focused on their active responsibilities.

## 1.0.25

Testing and CI organization release.

- Added focused test coverage for syntax, built-ins, CLI modes, and
  browser-safe core behavior.
- Centralized CI verification around package scripts.
- Added package README test summary.

## 1.0.24

CLI usability release.

- Added `sticks --help`, `sticks check`, `sticks run`, and `sticks init`.
- Kept legacy direct file execution for compatibility while documenting
  `sticks run` as the preferred command.
- Added starter project generation.

## 1.0.23

Browser environment release.

- Confirmed the core public API works without Node-specific APIs.
- Documented browser embedding and RuntimeIO usage.

## 1.0.22

Grammar specification release.

- Added clearer grammar documentation for statements, expressions, blocks,
  functions, comments, and error handling.

## 1.0.21

TypeScript API documentation release.

- Documented `lex`, `parse`, `runSource`, `RuntimeIO`, `RunResult`, and
  `SticksLiteError`.
- Added TypeScript embedding examples.

## 1.0.20

Documentation restructuring release.

- Moved examples into documentation-focused learning and reference pages.
- Improved docs homepage, install guidance, quick-start content, and mobile
  layout.

## Earlier 1.0.x Releases

Earlier 1.0.x releases built and stabilized the initial interpreter, parser,
lexer, CLI, documentation site, browser IDE, VS Code extension, friendly errors,
cross-platform CLI behavior, comments, math behavior, collection semantics,
responsible-use messaging, CI, and release automation.
