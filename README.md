# Sticks Lite Language

[![npm version](https://img.shields.io/npm/v/sticks-lite.svg)](https://www.npmjs.com/package/sticks-lite)
[![npm downloads](https://img.shields.io/npm/dm/sticks-lite.svg)](https://www.npmjs.com/package/sticks-lite)
[![Sticks Lite](https://img.shields.io/badge/Sticks%20Lite-v1.0.2-5cad4a.svg)](https://github.com/sticks-lite/sticks-lite)
[![GitHub stars](https://img.shields.io/github/stars/sticks-lite/sticks-lite?style=flat)](https://github.com/sticks-lite/sticks-lite/stars)
[![GitHub forks](https://img.shields.io/github/forks/sticks-lite/sticks-lite?style=flat)](https://github.com/sticks-lite/sticks-lite/forks)
[![CLI](https://img.shields.io/badge/CLI-sticks-111111.svg)](#command-line)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sticks Lite is a small educational programming language for monitored classroom environments. It is designed to teach introductory computer-science concepts with readable syntax, indentation-based blocks, friendly errors, and a compact TypeScript interpreter.

This repository contains the language core and the `sticks` command-line tool.

## Install

Install globally from npm:

```sh
npm install -g sticks-lite
```

Run a Sticks Lite file:

```sh
sticks main.slite
```

Run a directory containing `main.slite`:

```sh
sticks path/to/project
```

## Command Line

The CLI accepts either a `.slite` file or a project directory.

```sh
sticks examples/hello.slite
sticks ./student-project
```

When a directory is provided, Sticks Lite looks for:

```txt
main.slite
```

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
- Lists, tuples, dictionaries, indexing, and assignment to mutable collections.
- `attempt` and `when` for beginner-friendly error handling.
- Built-ins for conversion, type checks, collection operations, and math.
- Friendly `SticksLiteError` messages with line, column, and optional hints.

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

## Architecture

The language core is platform-independent.

```txt
source text
lexer
parser
AST
function pre-scan
interpreter
runtime I/O
```

Node.js file access, terminal input, and terminal output live in the CLI wrapper. The interpreter itself communicates through `RuntimeIO`, which keeps the core usable from the CLI, browser IDE, tests, and future classroom tools.

## Development

Install dependencies:

```sh
npm install
```

Run from source:

```sh
npm run dev -- examples/hello.slite
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

## Responsible Use

Sticks Lite is intended for monitored educational environments and introductory computer-science teaching.

It is not designed or represented as:

- a production programming language,
- a security sandbox,
- a permissions boundary,
- a package ecosystem for untrusted code,
- a high-risk, safety-critical, medical, legal, financial, or infrastructure tool.

Teachers and operators are responsible for supervising use, reviewing programs before execution, and deciding whether Sticks Lite is appropriate for their environment.

## Security Model

Sticks Lite keeps the interpreter small and explicit, but it is not a sandbox.

- The language core has no direct file-system or network APIs.
- The CLI wrapper reads source files and handles terminal I/O.
- Built-in names, error names, constants, and functions are protected from accidental overwrite.
- Friendly errors are intended for learning and debugging, not security enforcement.
- Do not run untrusted programs without external controls and supervision.

## Warranty And Liability

Sticks Lite is provided under the MIT License and is distributed as-is, without warranty of any kind. Kabir Sekhon, the Sticks Lite Project Authors, contributors, copyright holders, and maintainers are not liable for claims, damages, losses, misuse, classroom deployment issues, production use, data loss, security issues, or other liability arising from the software, documentation, examples, language design, interpreter, compiler, browser IDE, editor extension, or command-line tools.

See [LICENSE](LICENSE) for the full license and liability notice.

## License

MIT. The software is provided as-is, without warranty or liability.
