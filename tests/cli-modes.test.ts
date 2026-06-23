import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable, Writable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../src/cli/main";

const tempRoots: string[] = [];
const packageVersion = (require("../package.json") as { version: string }).version;

async function makeTempDir(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "sticks-lite-cli-modes-"));
  tempRoots.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("CLI modes", () => {
  it("prints help and version without reading a source file", async () => {
    await expect(invoke(["--help"])).resolves.toMatchObject({
      code: 0,
      error: ""
    });

    const version = await invoke(["--version"]);
    expect(version).toEqual({ code: 0, output: `${packageVersion}\n`, error: "" });
  });

  it("runs explicit and legacy file execution modes", async () => {
    const directory = await makeTempDir();
    await writeFile(path.join(directory, "main.slite"), "say \"main\"\n", "utf8");
    await writeFile(path.join(directory, "lesson.slite"), "say \"lesson\"\n", "utf8");

    await expect(invoke(["run"], directory)).resolves.toMatchObject({ code: 0, output: "main\n" });
    await expect(invoke(["run", "lesson.slite"], directory)).resolves.toMatchObject({ code: 0, output: "lesson\n" });
    await expect(invoke(["lesson.slite"], directory)).resolves.toMatchObject({ code: 0, output: "lesson\n" });
  });

  it("checks source files without executing them", async () => {
    const directory = await makeTempDir();
    await writeFile(path.join(directory, "main.slite"), "say missing\n", "utf8");

    const result = await invoke(["check"], directory);

    expect(result.code).toBe(0);
    expect(result.output).toBe("No syntax errors found in main.slite.\n");
    expect(result.error).toBe("");
  });

  it("creates runnable projects with init", async () => {
    const directory = await makeTempDir();

    const init = await invoke(["init", "classroom-demo"], directory);
    expect(init.code).toBe(0);
    expect(init.output).toContain("Created Sticks Lite project");

    const project = path.join(directory, "classroom-demo");
    expect(await readFile(path.join(project, "main.slite"), "utf8")).toContain("DEFINE PASSING_SCORE");
    expect(await readFile(path.join(project, "README.md"), "utf8")).toContain("sticks run");

    const run = await invoke(["run"], project, ["Maya\n82\n"]);
    expect(run.code).toBe(0);
    expect(run.output).toContain("Hello Maya");
    expect(run.output).toContain("Passing");
  });

  it("reports missing directory entry files through run and check modes", async () => {
    const directory = await makeTempDir();
    await mkdir(path.join(directory, "empty-project"));

    await expect(invoke(["run", "empty-project"], directory)).resolves.toMatchObject({ code: 1 });
    await expect(invoke(["check", "empty-project"], directory)).resolves.toMatchObject({ code: 1 });
  });
});

async function invoke(argv: string[], cwd?: string, inputChunks: string[] = []) {
  const output = captureWritable();
  const error = captureWritable();
  const code = await runCli({
    argv,
    cwd,
    input: Readable.from(inputChunks),
    output: output.stream,
    error: error.stream
  });

  return { code, output: output.text(), error: error.text() };
}

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
