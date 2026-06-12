# Sticks Lite Language

The Sticks Lite language package contains the TypeScript lexer, parser, interpreter, runtime values, friendly errors, and the `sticks` CLI.

Sticks Lite is intended for monitored educational environments and introductory computer-science teaching.

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

## Local Development

Install dependencies:

```sh
npm install
```

Run from source:

```sh
npm run dev -- examples/hello.slite
```

Build the distributable CLI:

```sh
npm run build
```

Run tests:

```sh
npm test
```

Run all checks:

```sh
npm run check
```

## Public API

```ts
import { lex, parse, runSource } from "sticks-lite";
```

Exports include:

- `lex(source: string)`
- `parse(source: string)`
- `runSource(source: string, io?)`
- `RuntimeIO`
- `SticksLiteError`

## License

MIT. The software is provided as-is, without warranty or liability.
