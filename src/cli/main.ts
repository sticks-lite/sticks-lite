#!/usr/bin/env node
import path from "node:path";
import readline from "node:readline";
import { stdin as processInput, stdout as processOutput, stderr as processError } from "node:process";
import type { Readable, Writable } from "node:stream";
import { isSticksLiteError, parse, runSource } from "../index";
import { CliInputError, initProject, readProgram } from "./files";

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

  if (argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    output.write(helpText());
    return 0;
  }

  const command = argv[0];

  if (command === "init") {
    return handleInit(argv[1], cwd, output, error);
  }

  if (command === "check") {
    return handleCheck(argv[1] ?? "main.slite", cwd, output, error);
  }

  if (command === "run") {
    return runTarget(argv[1] ?? "main.slite", cwd, input, output, error);
  }

  if (command !== undefined && isKnownCommandLike(command)) {
    error.write(`Unknown command: ${command}\n\n${helpText()}`);
    return 1;
  }

  return runTarget(command ?? "main.slite", cwd, input, output, error);
}

async function runTarget(target: string, cwd: string, input: Readable, output: Writable, error: Writable): Promise<number> {
  const resolved = path.resolve(cwd, target);
  let lineReader: ReturnType<typeof createLineReader> | undefined;

  try {
    const source = await readProgram(resolved);
    lineReader = createLineReader(input, output);
    const result = await runSource(source, {
      async readInput(prompt: string) {
        return lineReader!.read(prompt);
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
  } catch (caught) {
    const message = caught instanceof CliInputError ? caught.format() : caught instanceof Error ? caught.message : String(caught);
    error.write(`${message}\n`);
    return 1;
  } finally {
    lineReader?.close();
  }
}

async function handleCheck(target: string, cwd: string, output: Writable, error: Writable): Promise<number> {
  const resolved = path.resolve(cwd, target);
  try {
    const source = await readProgram(resolved);
    parse(source);
    output.write(`No syntax errors found in ${target}.\n`);
    return 0;
  } catch (caught) {
    const message = caught instanceof CliInputError ? caught.format() : isSticksLiteError(caught) ? caught.format() : caught instanceof Error ? caught.message : String(caught);
    error.write(`${message}\n`);
    return 1;
  }
}

async function handleInit(projectName: string | undefined, cwd: string, output: Writable, error: Writable): Promise<number> {
  if (!projectName) {
    error.write("Project name required.\n\nUsage: sticks init <project-name>\n");
    return 1;
  }

  const directory = path.resolve(cwd, projectName);
  try {
    const result = await initProject(directory);
    output.write(`Created Sticks Lite project in ${projectName}\n`);
    for (const file of result.files) {
      output.write(`- ${path.relative(directory, file)}\n`);
    }
    output.write("\nNext steps:\n");
    output.write(`  cd ${projectName}\n`);
    output.write("  sticks run\n");
    return 0;
  } catch (caught) {
    const message = caught instanceof CliInputError ? caught.format() : caught instanceof Error ? caught.message : String(caught);
    error.write(`${message}\n`);
    return 1;
  }
}

export async function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  const code = await runCli({ argv, cwd });
  if (code !== 0) process.exitCode = code;
}

function packageVersion(): string {
  return (require("../../package.json") as { version: string }).version;
}

function helpText(): string {
  return `Sticks Lite ${packageVersion()}

Usage:
  sticks run [file-or-directory]     Run a .slite file or folder. Defaults to main.slite.
  sticks check [file-or-directory]   Check syntax without running. Defaults to main.slite.
  sticks init <project-name>         Create a new Sticks Lite project folder.
  sticks --version                   Print the installed version.
  sticks --help                      Show this help.

Compatibility:
  sticks [file-or-directory]         Runs the target, or main.slite when omitted.

Examples:
  sticks init my-project
  cd my-project
  sticks check
  sticks run
`;
}

function isKnownCommandLike(value: string): boolean {
  return value.startsWith("-");
}

function createLineReader(input: Readable, output: Writable) {
  const rl = readline.createInterface({ input, terminal: false });
  const lines: string[] = [];
  const waiters: Array<(value: string) => void> = [];
  let closed = false;

  rl.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) {
      waiter(line);
    } else {
      lines.push(line);
    }
  });

  rl.on("close", () => {
    closed = true;
    while (waiters.length > 0) {
      waiters.shift()!("");
    }
  });

  return {
    read(prompt: string): Promise<string> {
      output.write(formatPrompt(prompt));
      const line = lines.shift();
      if (line !== undefined) return Promise.resolve(line);
      if (closed) return Promise.resolve("");
      return new Promise((resolve) => waiters.push(resolve));
    },
    close() {
      rl.close();
    }
  };
}

if (require.main === module) {
  void main();
}
