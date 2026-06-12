import { describe, expect, it } from "vitest";
import { lex, parse, runSource } from "../src";

async function errorFor(source: string) {
  const result = await runSource(source);
  expect(result.ok).toBe(false);
  return result.error ?? "";
}

describe("friendly errors", () => {
  it("reports unknown variables", async () => {
    await expect(errorFor("say toText(score)\n")).resolves.toContain("NameError");
  });

  it("reports bad indentation", () => {
    try {
      lex("if True:\n    say 'ok'\n  say 'bad'\n");
    } catch (error) {
      expect((error as Error).name).toBe("IndentationError");
      return;
    }
    throw new Error("Expected IndentationError");
  });

  it("reports missing colons", () => {
    expect(() => parse("if True\n    say 'bad'\n")).toThrow(/:/);
  });

  it("reports invalid otherwise", () => {
    expect(() => parse("otherwise:\n    say 'bad'\n")).toThrow(/otherwise/);
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
    await expect(errorFor("random = 5\n")).resolves.toContain("protected name");
  });

  it("reports wrong argument counts", async () => {
    await expect(errorFor("say toText()\n")).resolves.toContain("ArgumentError");
  });

  it("reports invalid indexes and missing dictionary keys", async () => {
    await expect(errorFor("items = [1]\nsay toText(items[2])\n")).resolves.toContain("IndexError");
    await expect(errorFor("person = {\"name\": \"Maya\"}\nsay person[\"age\"]\n")).resolves.toContain("KeyError");
  });

  it("reports tuple mutation", async () => {
    await expect(errorFor("point = (1, 2)\npoint[0] = 9\n")).resolves.toContain("Tuples cannot be changed");
  });

  it("reports division by zero and invalid toNumber", async () => {
    await expect(errorFor("say toText(5 / 0)\n")).resolves.toContain("MathError");
    await expect(errorFor("say toText(toNumber(\"abc\"))\n")).resolves.toContain("ValueError");
  });
});
