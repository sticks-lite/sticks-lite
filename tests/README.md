# Sticks Lite Test Suites

The package keeps release verification in one place so local runs and CI use the
same contract.

## Main Commands

```sh
npm test
npm run check
npm run ci:verify
npm run release:check
```

## Suite Map

- `lexer.test.ts`: tokenization, indentation, strings, comments, and errors.
- `parser.test.ts`: AST parsing and syntax-level rejection.
- `interpreter.test.ts`: core runtime behavior.
- `syntax-features.test.ts`: every documented syntax family in runnable programs.
- `builtins-all.test.ts`: every registered built-in and representative failures.
- `public-api.test.ts`: documented exports such as `lex`, `parse`, `runSource`,
  `RuntimeIO`, `RunResult`, and `SticksLiteError`.
- `browser-safe-core.test.ts`: browser-compatible runtime I/O and no Node APIs in
  the core.
- `cli.test.ts` and `cli-modes.test.ts`: file handling, CLI commands, prompts,
  input, output, and project initialization.
- `readme-features.test.ts`, `docs-examples.test.ts`, `errors.test.ts`,
  `semantics-lockdown.test.ts`, and `comments-math-stability.test.ts`: release
  regression coverage for documentation and classroom-facing behavior.
