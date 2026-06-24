# Sticks Lite Programming Language

[![npm version](https://img.shields.io/npm/v/sticks-lite.svg)](https://www.npmjs.com/package/sticks-lite)
[![npm downloads](https://img.shields.io/npm/dm/sticks-lite.svg)](https://www.npmjs.com/package/sticks-lite)
[![CI](https://github.com/sticks-lite/sticks-lite/actions/workflows/ci.yml/badge.svg)](https://github.com/sticks-lite/sticks-lite/actions/workflows/ci.yml)
[![Tests: 157](https://img.shields.io/badge/tests-157%20passing-brightgreen.svg)](#test-summary)
[![GitHub stars](https://img.shields.io/github/stars/sticks-lite/sticks-lite?style=flat)](https://github.com/sticks-lite/sticks-lite/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/sticks-lite/sticks-lite?style=flat)](https://github.com/sticks-lite/sticks-lite/forks)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sticks Lite is a small educational programming language for monitored
classroom environments. It teaches introductory programming with readable
syntax, indentation-based blocks, friendly errors, and a compact TypeScript
interpreter.

This repository contains the language core, interpreter, public TypeScript API,
and `sticks` CLI.

## Quick Links

| Resource | Purpose |
| --- | --- |
| [Documentation](https://github.com/sticks-lite/docs) | Guided learning, reference pages, tools, and classroom guidance. |
| [CLI Reference](https://github.com/sticks-lite/docs/blob/main/src/reference/cli.md) | `sticks run`, `sticks check`, `sticks init`, `--help`, and `--version`. |
| [TypeScript API](https://github.com/sticks-lite/docs/blob/main/src/reference/typescript-api.md) | `lex`, `parse`, `runSource`, `RuntimeIO`, `RunResult`, and `SticksLiteError`. |
| [Browser Embedding](https://github.com/sticks-lite/docs/blob/main/src/tools/browser.md) | Running Sticks Lite in browser-like environments. |
| [Responsible Use](https://github.com/sticks-lite/docs/blob/main/src/classroom/responsible-use.md) | Classroom safety and supervision guidance. |
| [Changelog](CHANGELOG.md) | Public release history. |
| [Contributing](CONTRIBUTING.md) | Development workflow and contribution expectations. |
| [Release Checklist](RELEASE.md) | Formal release verification steps. |
| [Security Policy](SECURITY.md) | Vulnerability reporting and security model. |
| [Support](SUPPORT.md) | Community support expectations. |

## Who This Is For

- Teachers and mentors introducing programming in a supervised classroom.
- Students learning variables, conditionals, loops, functions, collections, and
  errors.
- Clubs, camps, and beginner computer-science lessons that need a small
  `.slite` language and the `sticks` CLI.

Sticks Lite is intentionally small. It is not intended for production apps,
security sandboxing, unsupervised execution of untrusted source files, or
safety-critical work.

## Install

Install the CLI globally from npm:

```sh
npm install -g sticks-lite
```

Verify the install:

```sh
sticks --version
sticks --help
```

Create and run a starter project:

```sh
sticks init hello-sticks
cd hello-sticks
sticks check
sticks run
```

The starter program asks for a name and score.

## CLI Commands

| Command | What it does |
| --- | --- |
| `sticks --help` | Show CLI help. |
| `sticks --version` | Print the installed package version. |
| `sticks init my-project` | Create `main.slite` and `README.md` in a new project folder. |
| `sticks check` | Check `main.slite` without running it. |
| `sticks check file.slite` | Check a specific source file. |
| `sticks run` | Run `main.slite` in the current folder. |
| `sticks run file.slite` | Run a specific source file. |
| `sticks run ./project` | Run `main.slite` inside a project folder. |

For compatibility, `sticks file.slite` still runs a program, but `sticks run`
is the preferred command.

When a directory is provided, Sticks Lite looks for an exactly named
`main.slite` entry file. The lowercase filename is required on Windows, macOS,
and Linux so classroom projects behave consistently.

## Example Program

```slite
DEFINE MAX_SCORE = 100

score = 87

if score >= 90:
    say "A"
orif score >= 80:
    say "B"
otherwise:
    say "Keep practicing"

new double(value):
    return value * 2

say toText(double(MAX_SCORE))
```

## Language At A Glance

- `.slite` source files.
- One statement per line.
- `#` line comments and `/* */` block comments.
- Indentation-based blocks after `:`.
- Variables and global `DEFINE` constants.
- Boolean-only conditions with `True` and `False`.
- `if`, `orif`, `otherwise`, `repeat`, `loopif`, and `foreach`.
- `new` function definitions with call-before-definition support.
- Lists, tuples, dictionaries, indexing, and mutable collection assignment.
- `attempt` and `when` for beginner-friendly error handling.
- Built-ins for conversion, type checks, collection operations, and math.
- Friendly `SticksLiteError` messages with line, column, and optional hints.

## Public TypeScript API

```ts
import { lex, parse, runSource } from "sticks-lite";
```

Documented exports include:

| Export | Purpose |
| --- | --- |
| `lex(source)` | Convert source text into positioned tokens. |
| `parse(source)` | Convert source text into a `Program` AST. |
| `runSource(source, io?)` | Parse and execute source text. |
| `RuntimeIO` | Connect `ask` and `say` to a host environment. |
| `RunResult` | Structured success or failure result from `runSource`. |
| `SticksLiteError` | Friendly error with name, message, line, column, and optional hint. |

Example:

```ts
import { runSource } from "sticks-lite";

const output: string[] = [];

const result = await runSource('say "Hello, world!"', {
  readInput() {
    return "";
  },
  writeOutput(text) {
    output.push(text);
  },
});
```

## Browser Embedding

The public language core is browser-friendly. Import from `sticks-lite`, provide
`RuntimeIO`, and keep CLI modules out of browser bundles.

```ts
import { runSource, type RuntimeIO } from "sticks-lite";

const output: string[] = [];

const io: RuntimeIO = {
  async readInput(prompt) {
    output.push(`? ${prompt}`);
    return "Maya";
  },
  writeOutput(text) {
    output.push(text);
  },
};

const result = await runSource('name = ask "Name?"\nsay "Hello " + name\n', io);
```

Node-specific file access and terminal I/O are limited to the `sticks` CLI
wrapper. The core lexer, parser, interpreter, built-ins, and errors do not use
Node file-system, process, stream, or readline APIs.

## Repository Structure

```txt
src/             TypeScript source for lexer, parser, runtime, and CLI
tests/           Vitest suites and test-suite map
.github/         CI workflow and issue templates
CHANGELOG.md     Public release history
CONTRIBUTING.md  Contributor guide
RELEASE.md       Formal release checklist
SECURITY.md      Security policy
SUPPORT.md       Support policy
```

The language core is platform-independent:

```txt
source text
lexer
parser
AST
function pre-scan
interpreter
RuntimeIO
```

## Development

Install dependencies:

```sh
npm install
```

Run from source:

```sh
npm run dev -- run main.slite
```

Build:

```sh
npm run build
```

Test:

```sh
npm test
```

Run the package verification command:

```sh
npm run ci:verify
```

Run the formal package release check:

```sh
npm run release:check
```

## Test Summary

The current Sticks Lite release has 157 passing tests across 14 Vitest suites.

Focused commands:

```sh
npm run test:all
npm run test:syntax
npm run test:builtins
npm run test:cli
npm run test:browser
```

Coverage includes lexer and parser behavior, all syntax families, every
registered built-in, documented public APIs, browser-safe core execution, CLI
modes, project initialization, documentation examples, friendly errors, and
locked language semantics.

## Package Contents

The npm package is intentionally small. `npm pack --dry-run` should show only:

- `dist/`
- `README.md`
- `LICENSE`
- `package.json`

Source, tests, CI configuration, and release notes stay in the repository.

## Responsible Use

Use Sticks Lite in supervised learning settings. A teacher, mentor, or parent
should review what students run and decide whether each lesson is appropriate.

Sticks Lite keeps the interpreter small and explicit, but it is not a sandbox.

- The language core has no direct file-system or network APIs.
- The CLI wrapper reads `.slite` source files and handles terminal I/O.
- Built-in names, error names, constants, and functions are protected from
  accidental overwrite.
- Friendly errors are intended for learning and debugging, not security
  enforcement.
- Do not run untrusted programs without external controls and supervision.

## Warranty And Liability

Sticks Lite is provided under the MIT License and is distributed as-is, without
warranty of any kind. Kabir Sekhon, the Sticks Lite Project Authors,
contributors, copyright holders, and maintainers are not liable for claims,
damages, losses, misuse, classroom deployment issues, production use, data loss,
security issues, or other liability arising from the software, documentation,
examples, language design, interpreter, CLI, browser IDE, or editor extension.

See [LICENSE](LICENSE) for the full license and liability notice.
