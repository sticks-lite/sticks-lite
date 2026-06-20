#!/usr/bin/env node
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as processInput, stdout as processOutput, stderr as processError } from "node:process";
import type { Readable, Writable } from "node:stream";
import { runSource } from "../index";
import { CliInputError, readProgram } from "./files";

export interface CliRunOptions {
  argv?: string[];
  cwd?: string;
  input?: Readable;
  output?: Writable;
  error?: Writable;
}

export function formatPrompt(prompt: string): string {
  const normalized = prompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.length === 0 || /\s$/.test(normalized)) return normalized;
  return `${normalized} `;
}

export async function runCli(options: CliRunOptions = {}): Promise<number> {
  const argv = options.argv ?? process.argv.slice(2);
  const cwd = options.cwd ?? process.cwd();
  const input = options.input ?? processInput;
  const output: Writable = options.output ?? processOutput;
  const error: Writable = options.error ?? processError;

  if (argv[0] === "--version" || argv[0] === "-v") {
    output.write(`${packageVersion()}\n`);
    return 0;
  }

  const target = argv[0] ?? "main.slite";
  const resolved = path.resolve(cwd, target);
  let rl: ReturnType<typeof readline.createInterface> | undefined;

  try {
    const source = await readProgram(resolved);
    rl = readline.createInterface({ input, output, terminal: false });
    const result = await runSource(source, {
      async readInput(prompt: string) {
        return rl!.question(formatPrompt(prompt));
      },
      writeOutput(text: string) {
        output.write(`${text}\n`);
      }
    });
    if (!result.ok) {
      error.write(`${result.error}\n`);
      return 1;
    }
    return 0;
  } catch (error) {
    const message = error instanceof CliInputError ? error.format() : error instanceof Error ? error.message : String(error);
    options.error?.write(`${message}\n`) ?? processError.write(`${message}\n`);
    return 1;
  } finally {
    rl?.close();
  }
}

export async function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  const code = await runCli({ argv, cwd });
  if (code !== 0) process.exitCode = code;
}

function packageVersion(): string {
  return (require("../../package.json") as { version: string }).version;
}

if (require.main === module) {
  void main();
}
