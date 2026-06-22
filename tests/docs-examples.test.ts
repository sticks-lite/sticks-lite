import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runSource } from "../src";
import { BUILTIN_NAMES } from "../src/runtime/builtins";

const workspaceRoot = path.resolve(process.cwd(), "..");

const runnableDocs = [
  "sticks-lite/README.md",
  ...docsMarkdownFiles()
];

describe("README and docs examples", () => {
  for (const relativePath of runnableDocs) {
    it(`runs every slite example in ${relativePath}`, async () => {
      const absolutePath = path.join(workspaceRoot, relativePath);
      const markdown = normalizeMarkdownSource(fs.readFileSync(absolutePath, "utf8"));
      const snippets = sliteSnippets(markdown);
      if (snippets.length === 0) return;

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
    const markdown = normalizeMarkdownSource(fs.readFileSync(path.join(workspaceRoot, "docs/src/content.ts"), "utf8"));
    const snippets = sliteSnippets(markdown).join("\n\n");

    for (const name of BUILTIN_NAMES) {
      expect(markdown, `${name} table row`).toContain(`| \`${name}(`);
      expect(snippets, `${name} runnable example`).toContain(`${name}(`);
    }
  });
});

function docsMarkdownFiles(): string[] {
  const docsRoot = path.join(workspaceRoot, "docs");
  const files: string[] = [];
  if (!fs.existsSync(docsRoot)) return files;
  walk(docsRoot, files);
  return files
    .map((file) => path.relative(workspaceRoot, file))
    .filter((file) => !file.includes("node_modules") && !file.includes("dist"))
    .sort();
}

function walk(directory: string, files: string[]): void {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, files);
      continue;
    }
    if (entry.isFile() && /\.(md|mdx|ts|tsx)$/.test(entry.name)) {
      files.push(absolute);
    }
  }
}

function normalizeMarkdownSource(source: string): string {
  return source.replace(/\\`/g, "`");
}

function sliteSnippets(markdown: string): string[] {
  const snippets: string[] = [];
  const fencePattern = /```slite\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fencePattern.exec(markdown)) !== null) {
    snippets.push(match[1].trimEnd() + "\n");
  }
  return snippets;
}
