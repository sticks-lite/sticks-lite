# Sticks Lite Language

The Sticks Lite language package contains the TypeScript lexer, parser, interpreter, runtime values, friendly errors, and the `sticks` CLI.

Sticks Lite is intended for monitored educational environments and introductory computer-science teaching.

## Install

Install globally from npm after the package is published:

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

## Distribution

1. Create or sign in to an npm account.
2. Confirm the package name in `package.json`.
3. Build and test:

```sh
npm run check
```

4. Log in:

```sh
npm login
```

5. Publish publicly:

```sh
npm publish
```

After publishing, users can install with:

```sh
npm install -g sticks-lite
```

This package is intentionally unscoped on npm. Publishing as
`@brisqdev/sticks-lite` requires an npm account with permission to publish under
the `@brisqdev` scope.

## License

MIT. The software is provided as-is, without warranty or liability.
