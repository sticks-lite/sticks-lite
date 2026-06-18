import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable, Writable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { formatPrompt, runCli } from "../src/cli/main";
import { hasSliteExtension, pathBasenameForDisplay, readProgram, resolveProgramPath } from "../src/cli/files";

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
  it("handles Windows-style paths for display and extension checks", () => {
    expect(pathBasenameForDisplay("C:\\Users\\student\\project\\main.slite")).toBe("main.slite");
    expect(pathBasenameForDisplay("C:\\Users\\student\\project\\notes.txt")).toBe("notes.txt");
    expect(hasSliteExtension("C:\\Users\\student\\project\\MAIN.SLITE")).toBe(true);
    expect(hasSliteExtension("C:\\Users\\student\\project\\README.md")).toBe(false);
  });

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

  it("requires an exact main.slite entry for cross-platform directory execution", async () => {
    const directory = await makeTempDir();
    await writeFile(path.join(directory, "Main.slite"), "say \"wrong case\"\n", "utf8");

    await expect(readProgram(directory)).rejects.toThrow(/must be named `main\.slite`/);
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

describe("CLI runtime behavior", () => {
  it("formats prompts predictably", () => {
    expect(formatPrompt("Name?")).toBe("Name? ");
    expect(formatPrompt("Name? ")).toBe("Name? ");
    expect(formatPrompt("Line\n")).toBe("Line\n");
    expect(formatPrompt("")).toBe("");
  });

  it("runs main.slite from the current directory like a global sticks command", async () => {
    const directory = await makeTempDir();
    await writeFile(path.join(directory, "main.slite"), "say \"global\"\n", "utf8");
    const output = captureWritable();
    const error = captureWritable();

    const code = await runCli({ argv: [], cwd: directory, input: Readable.from([]), output: output.stream, error: error.stream });

    expect(code).toBe(0);
    expect(output.text()).toBe("global\n");
    expect(error.text()).toBe("");
  });

  it("prints the package version for global CLI checks", async () => {
    const output = captureWritable();
    const error = captureWritable();

    const code = await runCli({ argv: ["--version"], input: Readable.from([]), output: output.stream, error: error.stream });

    expect(code).toBe(0);
    expect(output.text()).toBe("1.0.13\n");
    expect(error.text()).toBe("");
  });

  it("runs a POSIX-style file path on macOS and Linux", async () => {
    const directory = await makeTempDir();
    const nested = path.join(directory, "lessons");
    await mkdir(nested);
    await writeFile(path.join(nested, "hello.slite"), "say \"posix\"\n", "utf8");
    const output = captureWritable();
    const error = captureWritable();

    const code = await runCli({ argv: ["lessons/hello.slite"], cwd: directory, input: Readable.from([]), output: output.stream, error: error.stream });

    expect(code).toBe(0);
    expect(output.text()).toBe("posix\n");
    expect(error.text()).toBe("");
  });

  it("keeps prompt and output ordering stable for CLI input/output", async () => {
    const directory = await makeTempDir();
    await writeFile(path.join(directory, "main.slite"), "say \"one\"\nname = ask \"Name?\"\nsay \"two \" + name\nsay \"three\"\n", "utf8");
    const output = captureWritable();
    const error = captureWritable();

    const code = await runCli({ argv: [], cwd: directory, input: Readable.from(["Ada\n"]), output: output.stream, error: error.stream });

    expect(code).toBe(0);
    expect(output.text()).toBe("one\nName? two Ada\nthree\n");
    expect(error.text()).toBe("");
  });

  it("handles empty CLI input and predictable output newlines", async () => {
    const directory = await makeTempDir();
    await writeFile(path.join(directory, "main.slite"), "answer = ask \"Value?\"\nsay \"Got \" + answer\nsay \"Done\"", "utf8");
    const output = captureWritable();
    const error = captureWritable();

    const code = await runCli({ argv: [], cwd: directory, input: Readable.from(["\n"]), output: output.stream, error: error.stream });

    expect(code).toBe(0);
    expect(output.text()).toBe("Value? Got \nDone\n");
    expect(error.text()).toBe("");
  });

  it("returns a non-zero code and writes errors to stderr", async () => {
    const directory = await makeTempDir();
    await writeFile(path.join(directory, "main.slite"), "say missing\n", "utf8");
    const output = captureWritable();
    const error = captureWritable();

    const code = await runCli({ argv: [], cwd: directory, input: Readable.from([]), output: output.stream, error: error.stream });

    expect(code).toBe(1);
    expect(output.text()).toBe("");
    expect(error.text()).toContain("NameError");
  });
});

function captureWritable() {
  let value = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      value += chunk.toString();
      callback();
    }
  });
  return {
    stream,
    text() {
      return value;
    }
  };
}
