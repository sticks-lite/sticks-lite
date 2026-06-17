import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const examplesDir = join(root, "examples");
const cliPath = join(root, "dist", "cli", "main.js");
const examples = readdirSync(examplesDir)
  .filter((file) => file.endsWith(".slite"))
  .sort();

if (examples.length === 0) {
  console.error("No .slite examples found.");
  process.exit(1);
}

for (const example of examples) {
  const filePath = join(examplesDir, example);
  const result = spawnSync(process.execPath, [cliPath, filePath], {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    console.error(`Example failed: ${example}`);
    if (result.stdout) console.error(result.stdout.trimEnd());
    if (result.stderr) console.error(result.stderr.trimEnd());
    process.exit(result.status ?? 1);
  }

  console.log(`ok ${example}`);
}
