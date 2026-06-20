import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runSource } from "../src";
import { BUILTIN_NAMES } from "../src/runtime/builtins";

const workspaceRoot = path.resolve(process.cwd(), "..");

const runnableDocs = [
  "sticks-lite/README.md",
  "docs/docs/getting-started.md",
  "docs/docs/tutorial.md",
  "docs/docs/examples.md",
  "docs/docs/standard-library.md"
];

describe("README and docs examples", () => {
  for (const relativePath of runnableDocs) {
    it(`runs every slite example in ${relativePath}`, async () => {
      const absolutePath = path.join(workspaceRoot, relativePath);
      const markdown = fs.readFileSync(absolutePath, "utf8");
      const snippets = sliteSnippets(markdown);

      expect(snippets.length, relativePath).toBeGreaterThan(0);

      for (const [index, snippet] of snippets.entries()) {
        const output: string[] = [];
        const result = await runSource(snippet, {
          readInput(prompt) {
            output.push(`prompt:${prompt}`);
            return "5";
          },
          writeOutput(text) {
            output.push(text);
          }
        });

        expect(result.ok, `${relativePath} snippet ${index + 1}: ${result.error ?? ""}`).toBe(true);
      }
    });
  }

  it("documents every built-in in the generated table and in a runnable example", () => {
    const markdown = fs.readFileSync(path.join(workspaceRoot, "docs/docs/standard-library.md"), "utf8");
    const snippets = sliteSnippets(markdown).join("\n\n");

    for (const name of BUILTIN_NAMES) {
      expect(markdown, `${name} table row`).toContain(`| \`${name}(`);
      expect(snippets, `${name} runnable example`).toContain(`${name}(`);
    }
  });
});

function sliteSnippets(markdown: string): string[] {
  const snippets: string[] = [];
  const fencePattern = /```slite\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fencePattern.exec(markdown)) !== null) {
    snippets.push(match[1].trimEnd() + "\n");
  }
  return snippets;
}
