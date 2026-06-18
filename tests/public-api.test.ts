import { describe, expect, it } from "vitest";
import {
  SticksLiteError,
  isSticksLiteError,
  lex,
  parse,
  runSource,
  type RunResult,
  type RuntimeIO
} from "../src";

describe("documented public exports", () => {
  it("lex returns positioned tokens", () => {
    const tokens = lex("say \"Hello\"\n");
    expect(tokens[0]).toMatchObject({ type: "keyword", lexeme: "say", line: 1, column: 1 });
    expect(tokens.at(-1)).toMatchObject({ type: "eof" });
  });

  it("parse returns a Program AST", () => {
    const program = parse("say \"Hello\"\n");
    expect(program.kind).toBe("Program");
    expect(program.body[0]).toMatchObject({ kind: "SayStatement", line: 1, column: 1 });
  });

  it("runSource returns a successful RunResult and writes through RuntimeIO", async () => {
    const output: string[] = [];
    const io: RuntimeIO = {
      readInput(prompt) {
        output.push(`prompt:${prompt}`);
        return "Maya";
      },
      writeOutput(text) {
        output.push(text);
      }
    };

    const result: RunResult = await runSource("name = ask \"Name?\"\nsay \"Hello \" + name\n", io);
    expect(result).toMatchObject({ ok: true, output: ["Hello Maya"] });
    expect(output).toEqual(["prompt:Name?", "Hello Maya"]);
  });

  it("RuntimeIO receives raw prompts, supports empty input, and preserves output order", async () => {
    const events: string[] = [];
    const io: RuntimeIO = {
      async readInput(prompt) {
        events.push(`prompt:${prompt}`);
        return "";
      },
      writeOutput(text) {
        events.push(`output:${text}`);
      }
    };

    const result = await runSource("say \"before\"\nanswer = ask \"\"\nsay \"after\" + answer\n", io);

    expect(result).toMatchObject({ ok: true, output: ["before", "after"] });
    expect(events).toEqual(["output:before", "prompt:", "output:after"]);
  });

  it("runSource returns a failed RunResult with output produced before the error", async () => {
    const result: RunResult = await runSource("say \"before\"\nsay toText(missing)\n");
    expect(result.ok).toBe(false);
    expect(result.output).toEqual(["before"]);
    expect(result.error).toContain("NameError");
    expect(result.error).toContain("Hint:");
  });

  it("SticksLiteError exposes name, location, hint, and formatted text", () => {
    const error = new SticksLiteError("SyntaxError", "Missing colon.", 2, 8, "Did you forget a colon after this block?");
    expect(error).toBeInstanceOf(Error);
    expect(isSticksLiteError(error)).toBe(true);
    expect(error.name).toBe("SyntaxError");
    expect(error.line).toBe(2);
    expect(error.column).toBe(8);
    expect(error.hint).toBe("Did you forget a colon after this block?");
    expect(error.format()).toContain("SyntaxError at line 2, column 8");
    expect(error.format()).toContain("Hint: Did you forget a colon after this block?");
  });
});
