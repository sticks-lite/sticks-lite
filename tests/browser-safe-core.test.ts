import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runSource, type RuntimeIO } from "../src";

const coreSourceRoot = path.resolve(__dirname, "../src");

describe("browser-safe core", () => {
  it("runs with browser-style async RuntimeIO", async () => {
    const events: string[] = [];
    const answers = ["Maya", "12"];
    const io: RuntimeIO = {
      async readInput(prompt) {
        events.push(`prompt:${prompt}`);
        await Promise.resolve();
        return answers.shift() ?? "";
      },
      writeOutput(text) {
        events.push(`output:${text}`);
      }
    };

    const result = await runSource('name = ask "Name?"\nage = ask "Age?"\nsay name + " is " + age\n', io);

    expect(result).toEqual({ ok: true, output: ["Maya is 12"] });
    expect(events).toEqual(["prompt:Name?", "prompt:Age?", "output:Maya is 12"]);
  });

  it("does not require Node-specific APIs outside the CLI wrapper", () => {
    const checkedFiles = sourceFiles(coreSourceRoot).filter((file) => !file.includes(`${path.sep}cli${path.sep}`));
    const forbidden = /\bfrom\s+["']node:|\brequire\s*\(|\bprocess\.|\bBuffer\b|\b__dirname\b|\b__filename\b/;

    for (const file of checkedFiles) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, path.relative(coreSourceRoot, file)).not.toMatch(forbidden);
    }
  });

  it("preserves prompt and output ordering with queued browser input", async () => {
    const events: string[] = [];
    const answers = ["2", "3"];
    const result = await runSource(
      [
        "left = ask \"Left?\"",
        "right = ask \"Right?\"",
        "say toText(toNumber(left) + toNumber(right))",
        ""
      ].join("\n"),
      {
        async readInput(prompt) {
          events.push(`prompt:${prompt}`);
          return answers.shift() ?? "";
        },
        writeOutput(text) {
          events.push(`output:${text}`);
        }
      }
    );

    expect(result).toEqual({ ok: true, output: ["5"] });
    expect(events).toEqual(["prompt:Left?", "prompt:Right?", "output:5"]);
  });
});

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(absolute));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(absolute);
    }
  }
  return files;
}
