#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { runSource } from "../index";

const target = process.argv[2] ?? "main.slite";
const resolved = path.resolve(process.cwd(), target);

async function readProgram(fileOrDirectory: string): Promise<string> {
  const info = await stat(fileOrDirectory);
  const filePath = info.isDirectory() ? path.join(fileOrDirectory, "main.slite") : fileOrDirectory;
  return readFile(filePath, "utf8");
}

const rl = readline.createInterface({ input, output });

async function main() {
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
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

void main();
