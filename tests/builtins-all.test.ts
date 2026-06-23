import { describe, expect, it } from "vitest";
import { runSource } from "../src";
import { BUILTIN_NAMES } from "../src/runtime/builtins";

const exercisedBuiltins = new Set([
  "random",
  "length",
  "toNumber",
  "toText",
  "isNumber",
  "isText",
  "isList",
  "isTuple",
  "isDictionary",
  "isBoolean",
  "isNull",
  "push",
  "insert",
  "remove",
  "round",
  "floor",
  "ceiling",
  "absolute"
]);

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

describe("all built-ins", () => {
  it("has an execution assertion for every registered built-in", () => {
    expect([...BUILTIN_NAMES].sort()).toEqual([...exercisedBuiltins].sort());
  });

  it("runs conversion, type-check, length, collection, and math built-ins", async () => {
    const result = await run([
      "items = [1, 3]",
      "push(items, 4)",
      "insert(items, 1, 2)",
      "remove(items, 3)",
      "point = (8, 9)",
      "student = {\"name\": \"Maya\"}",
      "nothing = null",
      "say toText(length(\"abc\"))",
      "say toText(length(items))",
      "say toText(length(point))",
      "say toText(length(student))",
      "say toText(toNumber(\"42\") + 1)",
      "say toText(isNumber(1))",
      "say toText(isText(\"x\"))",
      "say toText(isList(items))",
      "say toText(isTuple(point))",
      "say toText(isDictionary(student))",
      "say toText(isBoolean(True))",
      "say toText(isNull(nothing))",
      "say toText(random(5, 5))",
      "say toText(round(2.6))",
      "say toText(floor(2.9))",
      "say toText(ceiling(2.1))",
      "say toText(absolute(-8))",
      "say toText(items)",
      ""
    ].join("\n"));

    expect(result).toMatchObject({
      ok: true,
      output: [
        "3",
        "3",
        "2",
        "1",
        "43",
        "True",
        "True",
        "True",
        "True",
        "True",
        "True",
        "True",
        "5",
        "3",
        "2",
        "3",
        "8",
        "[1, 2, 3]"
      ]
    });
  });

  it("keeps built-in beginner errors friendly", async () => {
    await expect(run("say toText(length(10))\n")).resolves.toMatchObject({ ok: false });
    await expect(run("say toText(toNumber(\"abc\"))\n")).resolves.toMatchObject({ ok: false });
    await expect(run("items = []\nremove(items, 0)\n")).resolves.toMatchObject({ ok: false });
    await expect(run("items = [1]\ninsert(items, 2.5, 9)\n")).resolves.toMatchObject({ ok: false });
  });
});
