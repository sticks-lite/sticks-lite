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
    await expect(errorFor("say toText(toNumber(\"abc\"))\n")).resolves.toContain("Use text like");
    await expect(errorFor("say toText(toNumber(True))\n")).resolves.toContain("not boolean");
  });

  it("reports bad collection operations", async () => {
    const foreachError = await errorFor("person = {\"name\": \"Maya\"}\nforeach key in person:\n    say key\n");
    expect(foreachError).toContain("not dictionary");
    expect(foreachError).toContain("v1.0.12");

    const pushError = await errorFor("items = (1, 2)\npush(items, 3)\n");
    expect(pushError).toContain("must be a list, not tuple");
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
