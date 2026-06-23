# Sticks Lite Programming Language

[![npm version](https://img.shields.io/npm/v/sticks-lite.svg)](https://www.npmjs.com/package/sticks-lite)
[![npm downloads](https://img.shields.io/npm/dm/sticks-lite.svg)](https://www.npmjs.com/package/sticks-lite)
[![CI](https://github.com/sticks-lite/sticks-lite/actions/workflows/ci.yml/badge.svg)](https://github.com/sticks-lite/sticks-lite/actions/workflows/ci.yml)
[![Tests: 157](https://img.shields.io/badge/tests-157%20passing-brightgreen.svg)](#test-summary)
[![GitHub stars](https://img.shields.io/github/stars/sticks-lite/sticks-lite?style=flat)](https://github.com/sticks-lite/sticks-lite/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/sticks-lite/sticks-lite?style=flat)](https://github.com/sticks-lite/sticks-lite/forks)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sticks Lite is a small educational programming language for monitored
classroom environments. It is designed to teach introductory computer-science
concepts with readable syntax, indentation-based blocks, friendly errors, and a
compact TypeScript interpreter.

This repository contains the language core, interpreter, and `sticks` CLI.

## Who this is for

- Teachers and mentors introducing programming in a supervised classroom.
- Students learning variables, conditionals, loops, functions, collections, and errors.
- Clubs, camps, and beginner computer-science lessons that need a small `.slite`
  language and the `sticks` CLI.

Sticks Lite is intentionally small. It is not intended for production software
or unsupervised execution of untrusted source files.

## Install

Install globally from npm:

```sh
npm install -g sticks-lite
```

Check the installed CLI:

```sh
sticks --version
```

Run a `.slite` source file:

```sh
sticks run main.slite
```

Run a directory containing `main.slite`:

```sh
sticks run path/to/project
```

## CLI

The `sticks` CLI accepts either a `.slite` source file or a project directory.

```sh
sticks run main.slite
sticks run ./student-project
```

When a directory is provided, Sticks Lite looks for an exactly named entry file:

```txt
main.slite
```

The exact lowercase filename is required on Windows, macOS, and Linux so
classroom projects behave the same way everywhere.

Common commands:

```sh
sticks --help
sticks --version
sticks init my-project
sticks check main.slite
sticks run main.slite
```

`sticks check` and `sticks run` default to `main.slite` when no file or folder
is provided. For compatibility, `sticks main.slite` still runs a program, but
`sticks run` is the preferred form.

## Example

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

## Language Features

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
- Comment and math behavior is covered by stability tests for future releases.

## Public API

```ts
import { lex, parse, runSource } from "sticks-lite";
```

Exports include:

- `lex(source: string)`
- `parse(source: string)`
- `runSource(source: string, io?)`
- `RuntimeIO`
- `RunResult`
- `SticksLiteError`

Example:

```ts
import { runSource } from "sticks-lite";

const output: string[] = [];

const result = await runSource('say "Hello, world!"', {
  readInput(prompt) {
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

## Architecture

The language core is platform-independent.

```txt
source file text
lexer
parser
AST
function pre-scan
interpreter
runtime I/O
```

Node.js file access, terminal input, and terminal output live in the CLI
wrapper. The interpreter itself communicates through `RuntimeIO`, which keeps
the core usable from the CLI, browser IDE, tests, and future classroom tools.

## Development

Install dependencies:

```sh
npm install
```

Run from source:

```sh
npm run dev -- main.slite
```

Build:

```sh
npm run build
```

Test:

```sh
npm test
```

Run all checks:

```sh
npm run check
```

## Test Summary

The current Sticks Lite release has 157 passing tests across 14 Vitest suites.

Use the centralized scripts below for local development and CI:

```sh
npm run test:all
npm run test:syntax
npm run test:builtins
npm run test:cli
npm run test:browser
npm run ci:verify
npm run release:check
```

Coverage includes lexer and parser behavior, all syntax families, every
registered built-in, documented public APIs, browser-safe core execution, CLI
modes, project initialization, documentation examples, friendly errors, and
locked language semantics.

## Responsible Use

Use Sticks Lite in supervised learning settings. A teacher, mentor, or parent
should review what students run and decide whether each lesson is appropriate.

Sticks Lite is not for production apps, security sandboxing, unsupervised
execution of untrusted source files, or safety-critical work.

## Security Model

Sticks Lite keeps the interpreter small and explicit, but it is not a sandbox.

- The language core has no direct file-system or network APIs.
- The CLI wrapper reads `.slite` source files and handles terminal I/O.
- Built-in names, error names, constants, and functions are protected from
  accidental overwrite.
- Core collection, function, constant, and protected-name semantics are covered
  by regression tests before feature releases.
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
