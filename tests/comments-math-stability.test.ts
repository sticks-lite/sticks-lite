import { describe, expect, it } from "vitest";
import { lex, runSource } from "../src";

async function run(source: string) {
  const output: string[] = [];
  const result = await runSource(source, {
    readInput() {
      return "";
    },
    writeOutput(text) {
      output.push(text);
    }
  });
  return { ...result, output };
}

async function errorFor(source: string) {
  const result = await run(source);
  expect(result.ok).toBe(false);
  return result.error ?? "";
}

describe("comments stability", () => {
  it("ignores # line comments beside real code", async () => {
    const result = await run([
      "score = 1 # start score",
      "score += 2 # add two",
      "say toText(score) # print",
      "# final comment",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["3"] });
  });

  it("does not treat # inside strings as comments", async () => {
    const result = await run([
      "say \"# not a comment\"",
      "say \"value # still text\" # comment after string",
      "say '# single quoted hash'",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["# not a comment", "value # still text", "# single quoted hash"] });
  });

  it("does not treat block comment markers inside strings as comments", async () => {
    const result = await run([
      "say \"/* not a block */\"",
      "say \"text before */ text after\"",
      "say \"text before /* text after\"",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["/* not a block */", "text before */ text after", "text before /* text after"] });
  });

  it("supports block comments beside and between real code", async () => {
    const result = await run([
      "x = 1 /* inline block */ + 2",
      "y = 10/* between tokens */+5",
      "/* whole line block */",
      "say toText(x)",
      "say toText(y)",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["3", "15"] });
  });

  it("supports comments around blocks without changing indentation semantics", async () => {
    const result = await run([
      "if True: # block opener comment",
      "    # inside block comment",
      "    say \"inside\" /* inline */",
      "/* between blocks */",
      "say \"outside\"",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["inside", "outside"] });
  });

  it("handles # comments with LF, CRLF, and CR line endings", () => {
    expect(lex("say \"lf\" # comment\nsay \"next\"\n").map((token) => token.lexeme)).toContain("\"next\"");
    expect(lex("say \"crlf\" # comment\r\nsay \"next\"\r\n").map((token) => token.lexeme)).toContain("\"next\"");
    expect(lex("say \"cr\" # comment\rsay \"next\"\r").map((token) => token.lexeme)).toContain("\"next\"");
  });

  it("continues to reject nested and unclosed block comments", () => {
    expect(() => lex("/* outer /* inner */ */\n")).toThrow(/Nested block comments/);
    expect(() => lex("say \"before\"\n/* never closed\n")).toThrow(/not closed/);
  });
});

describe("number and math stability", () => {
  it("evaluates numeric literals, precedence, and unary minus", async () => {
    const result = await run([
      "say toText(2 + 3 * 4)",
      "say toText((2 + 3) * 4)",
      "say toText(-5 + 2)",
      "say toText(7.5 - 2.25)",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["14", "20", "-3", "5.25"] });
  });

  it("evaluates division, integer division, and remainder edge cases", async () => {
    const result = await run([
      "say toText(7 / 2)",
      "say toText(7 div 2)",
      "say toText(-7 div 2)",
      "say toText(7 % 3)",
      "say toText(-7 % 3)",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["3.5", "3", "-3", "1", "-1"] });
  });

  it("rejects division, integer division, and modulo by zero", async () => {
    await expect(errorFor("say toText(1 / 0)\n")).resolves.toContain("Division by zero");
    await expect(errorFor("say toText(1 div 0)\n")).resolves.toContain("Integer division by zero");
    await expect(errorFor("say toText(1 % 0)\n")).resolves.toContain("Modulo by zero");
  });

  it("locks comparison behavior for numbers and equality across value types", async () => {
    const result = await run([
      "say toText(2 < 3)",
      "say toText(3 <= 3)",
      "say toText(4 > 3)",
      "say toText(4 >= 5)",
      "say toText(4 == 4)",
      "say toText(4 != \"4\")",
      "say toText([1, 2] == [1, 2])",
      "say toText({\"a\": 1} == {\"a\": 1})",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["True", "True", "True", "False", "True", "True", "True", "True"] });
  });

  it("rejects ordering comparisons for non-numbers", async () => {
    await expect(errorFor("say toText(\"a\" < \"b\")\n")).resolves.toContain("compares numbers");
    await expect(errorFor("say toText(1 < \"2\")\n")).resolves.toContain("compares numbers");
  });

  it("locks math built-ins and their argument errors", async () => {
    const result = await run([
      "say toText(random(4, 4))",
      "say toText(round(3.5))",
      "say toText(floor(-1.2))",
      "say toText(ceiling(-1.8))",
      "say toText(absolute(-12))",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["4", "4", "-2", "-1", "12"] });
    await expect(errorFor("say toText(random(10, 1))\n")).resolves.toContain("minimum");
    await expect(errorFor("say toText(round(\"3\"))\n")).resolves.toContain("must be a number");
  });
});
