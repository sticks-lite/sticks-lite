import { constants } from "node:fs";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ENTRY_FILE = "main.slite";
const EXTENSION = ".slite";

export class CliInputError extends Error {
  constructor(
    message: string,
    readonly hint?: string
  ) {
    super(message);
    this.name = "FileError";
  }

  format(): string {
    return this.hint ? `${this.name}: ${this.message}\nHint: ${this.hint}` : `${this.name}: ${this.message}`;
  }
}

export async function readProgram(fileOrDirectory: string): Promise<string> {
  const filePath = await resolveProgramPath(fileOrDirectory);
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    throw readablePathError(filePath, error);
  }
}

export interface InitProjectResult {
  directory: string;
  files: string[];
}

export async function initProject(projectDirectory: string): Promise<InitProjectResult> {
  await mkdir(projectDirectory, { recursive: true });
  const mainPath = path.join(projectDirectory, ENTRY_FILE);
  const readmePath = path.join(projectDirectory, "README.md");

  await assertCanCreate(mainPath);
  await assertCanCreate(readmePath);

  await writeFile(mainPath, defaultMainSource(), "utf8");
  await writeFile(readmePath, projectReadme(projectNameForReadme(projectDirectory)), "utf8");

  return { directory: projectDirectory, files: [mainPath, readmePath] };
}

export async function resolveProgramPath(fileOrDirectory: string): Promise<string> {
  let info;
  try {
    info = await stat(fileOrDirectory);
  } catch (error) {
    throw missingPathError(fileOrDirectory, error);
  }

  if (info.isDirectory()) {
    return resolveDirectoryEntry(fileOrDirectory);
  }

  if (!info.isFile()) {
    throw new CliInputError(
      `\`${fileOrDirectory}\` is not a Sticks Lite source file or folder.`,
      "Run `sticks path/to/main.slite` or `sticks path/to/folder`."
    );
  }

  assertSliteExtension(fileOrDirectory);
  await assertReadable(fileOrDirectory);
  return fileOrDirectory;
}

export function pathBasenameForDisplay(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? filePath;
}

export function hasSliteExtension(filePath: string): boolean {
  return path.extname(pathBasenameForDisplay(filePath)).toLowerCase() === EXTENSION;
}

function assertSliteExtension(filePath: string): void {
  if (!hasSliteExtension(filePath)) {
    throw new CliInputError(
      `Sticks Lite can only run \`${EXTENSION}\` source files. Received \`${pathBasenameForDisplay(filePath)}\`.`,
      "Rename the source file to end in `.slite`, such as `main.slite`."
    );
  }
}

async function resolveDirectoryEntry(directory: string): Promise<string> {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch (error) {
    throw readablePathError(directory, error);
  }

  if (entries.length === 0) {
    throw new CliInputError(
      `\`${directory}\` is an empty folder.`,
      "Add `main.slite` to the folder, or run `sticks path/to/source.slite`."
    );
  }

  if (!entries.includes(ENTRY_FILE)) {
    const differentlyCasedEntry = entries.find((entry) => entry.toLowerCase() === ENTRY_FILE);
    if (differentlyCasedEntry) {
      throw new CliInputError(
        `\`${directory}\` contains \`${differentlyCasedEntry}\`, but the entry file must be named \`${ENTRY_FILE}\`.`,
        "Rename the file exactly to `main.slite` so the project runs the same way on Windows, macOS, and Linux."
      );
    }
    throw new CliInputError(
      `\`${directory}\` does not contain \`${ENTRY_FILE}\`.`,
      "Create `main.slite` in that folder, or pass a specific `.slite` source file."
    );
  }

  const entry = path.join(directory, ENTRY_FILE);
  try {
    const info = await stat(entry);
    if (!info.isFile()) {
      throw new CliInputError(
        `\`${entry}\` exists but is not a file.`,
        "Replace it with a Sticks Lite source file named `main.slite`."
      );
    }
  } catch (error) {
    if (error instanceof CliInputError) throw error;
    const code = errorCode(error);
    if (code === "EACCES" || code === "EPERM") {
      throw readablePathError(entry, error);
    }
    throw missingPathError(entry, error);
  }

  await assertReadable(entry);
  return entry;
}

async function assertReadable(filePath: string): Promise<void> {
  try {
    await access(filePath, constants.R_OK);
  } catch (error) {
    throw readablePathError(filePath, error);
  }
}

async function assertCanCreate(filePath: string): Promise<void> {
  try {
    await access(filePath, constants.F_OK);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return;
    throw readablePathError(filePath, error);
  }
  throw new CliInputError(
    `Cannot create \`${filePath}\` because it already exists.`,
    "Choose a new project folder, or move the existing file before running `sticks init`."
  );
}

function missingPathError(filePath: string, error: unknown): CliInputError {
  const code = errorCode(error);
  if (code === "EACCES" || code === "EPERM") {
    return readablePathError(filePath, error);
  }
  return new CliInputError(
    `Could not find \`${filePath}\`.`,
    "Check the path, or run `sticks` from a folder that contains `main.slite`."
  );
}

function readablePathError(filePath: string, error: unknown): CliInputError {
  const code = errorCode(error);
  const reason = code ? ` (${code})` : "";
  return new CliInputError(
    `Cannot read \`${filePath}\`${reason}.`,
    "Check the file permissions and try again from a readable folder."
  );
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : undefined;
}

function projectNameForReadme(projectDirectory: string): string {
  const name = pathBasenameForDisplay(projectDirectory);
  return name.length > 0 ? name : "Sticks Lite Project";
}

function defaultMainSource(): string {
  return `# Welcome to Sticks Lite.
# Run this project with:
# sticks run

DEFINE PASSING_SCORE = 70

name = ask "Name?"
scoreText = ask "Score?"
score = toNumber(scoreText)

say "Hello " + name

if score >= PASSING_SCORE:
    say "Passing"
otherwise:
    say "Keep practicing"
`;
}

function projectReadme(projectName: string): string {
  return `# ${projectName}

A small Sticks Lite project for learning programming fundamentals.

## Files

- \`main.slite\` - the program entry file.
- \`README.md\` - notes for this project.

## Run

From this folder:

\`\`\`sh
sticks run
\`\`\`

Or from another folder:

\`\`\`sh
sticks run path/to/${projectName}
\`\`\`

## Check

Check the program without running it:

\`\`\`sh
sticks check
\`\`\`

## Learn

Try changing the passing score, prompt text, or messages in \`main.slite\`.
Sticks Lite is intended for monitored educational environments.
`;
}
