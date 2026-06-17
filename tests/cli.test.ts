import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readProgram, resolveProgramPath } from "../src/cli/files";

const tempRoots: string[] = [];

async function makeTempDir(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "sticks-lite-cli-"));
  tempRoots.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("CLI file handling", () => {
  it("reads a direct .slite file", async () => {
    const directory = await makeTempDir();
    const file = path.join(directory, "lesson.slite");
    await writeFile(file, "say \"hi\"\n", "utf8");

    await expect(readProgram(file)).resolves.toBe("say \"hi\"\n");
  });

  it("reads main.slite from a directory", async () => {
    const directory = await makeTempDir();
    const file = path.join(directory, "main.slite");
    await writeFile(file, "say \"main\"\n", "utf8");

    await expect(resolveProgramPath(directory)).resolves.toBe(file);
  });

  it("reports missing files clearly", async () => {
    const directory = await makeTempDir();
    await expect(readProgram(path.join(directory, "missing.slite"))).rejects.toThrow(/Could not find/);
  });

  it("rejects files without the .slite extension", async () => {
    const directory = await makeTempDir();
    const file = path.join(directory, "notes.txt");
    await writeFile(file, "say \"hi\"\n", "utf8");

    await expect(readProgram(file)).rejects.toThrow(/can only run `.slite` files/);
  });

  it("reports empty directories and directories missing main.slite", async () => {
    const empty = await makeTempDir();
    await expect(readProgram(empty)).rejects.toThrow(/empty folder/);

    const missingMain = await makeTempDir();
    await writeFile(path.join(missingMain, "lesson.slite"), "say \"hi\"\n", "utf8");
    await expect(readProgram(missingMain)).rejects.toThrow(/does not contain `main\.slite`/);
  });

  it("reports unreadable files", async () => {
    const directory = await makeTempDir();
    const file = path.join(directory, "main.slite");
    await writeFile(file, "say \"hi\"\n", "utf8");
    await chmod(file, 0o000);

    try {
      await expect(readProgram(file)).rejects.toThrow(/Cannot read/);
    } finally {
      await chmod(file, 0o600);
    }
  });
});
