#!/usr/bin/env node
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { runSource } from "../index";
import { CliInputError, readProgram } from "./files";

export async function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  const target = argv[0] ?? "main.slite";
  const resolved = path.resolve(cwd, target);
  const rl = readline.createInterface({ input, output });

  try {
    const source = await readProgram(resolved);
    const result = await runSource(source, {
      async readInput(prompt: string) {
        return rl.question(`${prompt} `);
      },
      writeOutput(text: string) {
        console.log(text);
      }
    });
    if (!result.ok) {
      console.error(result.error);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof CliInputError ? error.format() : error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  void main();
}
