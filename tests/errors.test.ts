import { describe, expect, it } from "vitest";
import { lex, parse, runSource } from "../src";
import { SticksLiteError } from "../src/runtime/errors";

async function errorFor(source: string) {
  const result = await runSource(source);
  expect(result.ok).toBe(false);
  return result.error ?? "";
}

describe("friendly errors", () => {
  it("reports unknown variables", async () => {
    const error = await errorFor("say toText(score)\n");
    expect(error).toContain("NameError");
    expect(error).toContain("spelling and capitalization");
  });

  it("reports bad indentation", () => {
    try {
      lex("if True:\n    say 'ok'\n  say 'bad'\n");
    } catch (error) {
      expect((error as Error).name).toBe("IndentationError");
      expect((error as Error).message).toContain("indentation level");
      return;
    }
    throw new Error("Expected IndentationError");
  });

  it("reports missing colons", () => {
    expectHint(() => parse("if True\n    say 'bad'\n"), /Put `:` at the end/);
  });

  it("reports invalid otherwise", () => {
    expectHint(() => parse("otherwise:\n    say 'bad'\n"), /final block in an `if` chain/);
  });

  it("reports invalid standalone orif", () => {
    expectHint(() => parse("orif True:\n    say 'bad'\n"), /Start with `if`/);
  });

  it("reports unfinished strings", () => {
    expectHint(() => lex("say \"hello\n"), /matching quote/);
  });

  it("reports invalid repeat counts", async () => {
    await expect(errorFor("repeat 2.5 times:\n    say 'bad'\n")).resolves.toContain("whole number");
    await expect(errorFor("repeat -1 times:\n    say 'bad'\n")).resolves.toContain("cannot be negative");
  });

  it("reports constant reassignment and non-top-level constants", async () => {
    await expect(errorFor("DEFINE PI = 3.14\nPI = 5\n")).resolves.toContain("ConstantError");
    await expect(errorFor("if True:\n    DEFINE PI = 3.14\n")).resolves.toContain("top level");
  });

  it("reports protected built-in overwrite", async () => {
    await expect(errorFor("random = 5\n")).resolves.toContain("protected built-in function name");
  });

  it("reports wrong argument counts", async () => {
    const builtinError = await errorFor("say toText()\n");
    expect(builtinError).toContain("ArgumentError");
    expect(builtinError).toContain("pass exactly 1");

    const functionError = await errorFor("new greet(name):\n    say name\ngreet()\n");
    expect(functionError).toContain("ArgumentError");
    expect(functionError).toContain("greet(name)");
  });

  it("reports invalid indexes and missing dictionary keys", async () => {
    const rangeError = await errorFor("items = [1]\nsay toText(items[2])\n");
    expect(rangeError).toContain("IndexError");
    expect(rangeError).toContain("Valid indexes");

    const typeError = await errorFor("items = [1]\nsay toText(items[\"zero\"])\n");
    expect(typeError).toContain("whole numbers, not text");

    const keyError = await errorFor("person = {\"name\": \"Maya\"}\nsay person[\"age\"]\n");
    expect(keyError).toContain("KeyError");
    expect(keyError).toContain("Check the key spelling");
  });

  it("reports tuple mutation", async () => {
    const error = await errorFor("point = (1, 2)\npoint[0] = 9\n");
    expect(error).toContain("Tuples cannot be changed");
    expect(error).toContain("Use a list");
  });

  it("reports division by zero and invalid toNumber", async () => {
    await expect(errorFor("say toText(5 / 0)\n")).resolves.toContain("MathError");
    await expect(errorFor("say toText(toNumber(\"abc\"))\n")).resolves.toContain("Use text that contains only a number");
    await expect(errorFor("say toText(toNumber(True))\n")).resolves.toContain("not boolean");
  });

  it("reports bad collection operations", async () => {
    const foreachError = await errorFor("person = {\"name\": \"Maya\"}\nforeach key in person:\n    say key\n");
    expect(foreachError).toContain("not dictionary");
    expect(foreachError).toContain("Dictionary iteration is not supported in Sticks Lite");

    const pushError = await errorFor("items = (1, 2)\npush(items, 3)\n");
    expect(pushError).toContain("must be a list, not tuple");
  });

  it("keeps the top beginner mistakes tied to concrete hints and locations", async () => {
    const cases: Array<{
      name: string;
      source: string;
      hint: RegExp;
      mode?: "lex" | "parse" | "run";
    }> = [
      {
        name: "mixed indentation on one line",
        source: "if True:\n \tsay \"bad\"\n",
        mode: "lex",
        hint: /Four spaces/
      },
      {
        name: "unmatched dedent",
        source: "if True:\n    say \"ok\"\n  say \"bad\"\n",
        mode: "lex",
        hint: /Line this statement up/
      },
      {
        name: "missing colon after if",
        source: "if True\n    say \"bad\"\n",
        mode: "parse",
        hint: /Put `:` at the end/
      },
      {
        name: "block body on same line",
        source: "if True: say \"bad\"\n",
        mode: "parse",
        hint: /next line/
      },
      {
        name: "empty block",
        source: "if True:\n",
        mode: "parse",
        hint: /Indent at least one statement/
      },
      {
        name: "standalone orif",
        source: "orif True:\n    say \"bad\"\n",
        mode: "parse",
        hint: /Start with `if`/
      },
      {
        name: "standalone otherwise",
        source: "otherwise:\n    say \"bad\"\n",
        mode: "parse",
        hint: /final block/
      },
      {
        name: "standalone when",
        source: "when ValueError:\n    say \"bad\"\n",
        mode: "parse",
        hint: /Write `attempt:` first/
      },
      {
        name: "say with parentheses",
        source: "say(\"hello\")\n",
        mode: "parse",
        hint: /say "Hello"/
      },
      {
        name: "ask with parentheses",
        source: "name = ask(\"Name?\")\n",
        mode: "parse",
        hint: /ask "Name\?"/
      },
      {
        name: "repeat without times",
        source: "repeat 3:\n    say \"bad\"\n",
        mode: "parse",
        hint: /repeat 5 times/
      },
      {
        name: "foreach without in",
        source: "foreach item items:\n    say item\n",
        mode: "parse",
        hint: /foreach score in scores/
      },
      {
        name: "invalid when error name",
        source: "attempt:\n    say \"x\"\nwhen NotARealError:\n    say \"bad\"\n",
        mode: "parse",
        hint: /ValueError/
      },
      {
        name: "attempt without handler",
        source: "attempt:\n    say \"x\"\n",
        mode: "parse",
        hint: /when ValueError/
      },
      {
        name: "unfinished string",
        source: "say \"hello\n",
        mode: "lex",
        hint: /say "Hello"/
      },
      {
        name: "unexpected character",
        source: "say @\n",
        mode: "lex",
        hint: /supported operator/
      },
      {
        name: "unclosed block comment",
        source: "/* note\nsay \"x\"\n",
        mode: "lex",
        hint: /\/\*/
      },
      {
        name: "unquoted dictionary key",
        source: "student = {name: \"Maya\"}\n",
        mode: "parse",
        hint: /\{"name": "Maya"\}/
      },
      {
        name: "one-item tuple",
        source: "point = (1,)\n",
        mode: "parse",
        hint: /\[10\]/
      },
      {
        name: "two statements on one line",
        source: "say \"one\" say \"two\"\n",
        mode: "parse",
        hint: /own line/
      },
      {
        name: "undefined variable",
        source: "say score\n",
        hint: /score = \.\.\./
      },
      {
        name: "text and number with plus",
        source: "score = 5\nsay \"Score: \" + score\n",
        hint: /toText\(score\)/
      },
      {
        name: "non-boolean condition",
        source: "if 1:\n    say \"bad\"\n",
        hint: /score > 0/
      },
      {
        name: "wrong built-in argument count",
        source: "say toText()\n",
        hint: /Example: `toText\(42\)`/
      },
      {
        name: "wrong function argument count",
        source: "new greet(name):\n    say name\ngreet()\n",
        hint: /greet\(name\)/
      },
      {
        name: "invalid toNumber value",
        source: "say toText(toNumber(\"abc\"))\n",
        hint: /"42"/
      },
      {
        name: "index out of range",
        source: "items = [1]\nsay toText(items[2])\n",
        hint: /0 through 0/
      },
      {
        name: "missing dictionary key",
        source: "person = {\"name\": \"Maya\"}\nsay person[\"age\"]\n",
        hint: /dictionary\["age"\]/
      },
      {
        name: "calling a non-function",
        source: "name = \"Maya\"\nname()\n",
        hint: /new greet/
      }
    ];

    for (const testCase of cases) {
      const error = await formattedErrorFor(testCase.source, testCase.mode ?? "run");
      expect(error, testCase.name).toMatch(/ at line \d+, column \d+:/);
      expect(error, testCase.name).toContain("Hint:");
      expect(error, testCase.name).toMatch(testCase.hint);
    }
  });
});

function expectHint(action: () => unknown, hint: RegExp) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(SticksLiteError);
    expect((error as SticksLiteError).hint).toMatch(hint);
    return;
  }
  throw new Error("Expected SticksLiteError");
}

async function formattedErrorFor(source: string, mode: "lex" | "parse" | "run") {
  if (mode === "run") return errorFor(source);
  try {
    if (mode === "lex") lex(source);
    else parse(source);
  } catch (error) {
    expect(error).toBeInstanceOf(SticksLiteError);
    return (error as SticksLiteError).format();
  }
  throw new Error("Expected SticksLiteError");
}
