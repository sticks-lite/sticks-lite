# Contributing

Thank you for helping improve Sticks Lite. This project is small on purpose:
changes should make beginner classroom programming easier to teach, easier to
run, or easier to understand.

Sticks Lite is intended for monitored educational environments. It is not a
production application runtime, a security sandbox, or a safe executor for
untrusted code.

## Ways To Contribute

- Fix reproducible bugs in the lexer, parser, interpreter, CLI, or public API.
- Improve friendly error messages and hints.
- Clarify documentation or classroom examples.
- Add focused tests for documented language behavior.
- Report install, CLI, or classroom-use issues with small reproduction files.

## Before Opening An Issue

Check the README and documentation first, then open the most specific issue
template available.

For bug reports, include:

- Sticks Lite version from `sticks --version`.
- Node.js version from `node --version`.
- Operating system.
- Exact command you ran.
- Minimal `.slite` source file.
- Expected behavior.
- Actual behavior.

Do not include private student information, school records, credentials, access
tokens, or identifying classroom data.

## Development Setup

Install dependencies:

```sh
npm install
```

Build the package:

```sh
npm run build
```

Run the full test suite:

```sh
npm test
```

Run the package verification command:

```sh
npm run ci:verify
```

## Focused Test Commands

Use focused tests while working on one area:

```sh
npm run test:syntax
npm run test:builtins
npm run test:cli
npm run test:browser
```

Before opening a pull request, run:

```sh
npm run release:check
```

## Pull Request Expectations

- Keep changes small and tied to one purpose.
- Add or update tests for behavior changes.
- Update documentation when public behavior changes.
- Keep the public API browser-safe unless the change is explicitly CLI-only.
- Prefer friendly beginner-facing errors over terse internal errors.
- Avoid adding runtime dependencies unless they are truly necessary.
- Do not commit package artifacts such as `.tgz` or `.vsix` files.

## Language Design Expectations

Sticks Lite should remain teachable. Syntax and runtime changes should have a
clear classroom reason and should avoid surprising existing student programs.

When changing language behavior, include tests for:

- lexer behavior when syntax changes,
- parser behavior for valid and invalid forms,
- interpreter behavior for successful programs,
- friendly errors for beginner mistakes,
- documentation examples if docs change.

## Security Reports

Do not report suspected security vulnerabilities in public issues. Follow
`SECURITY.md`.

## Code Of Conduct

Participation in this project follows `CODE_OF_CONDUCT.md`.
