import { describe, expect, it } from "vitest";
import { runSource } from "../src";

async function run(source: string, inputs: string[] = []) {
  const written: string[] = [];
  const result = await runSource(source, {
    readInput() {
      return inputs.shift() ?? "";
    },
    writeOutput(text) {
      written.push(text);
    }
  });
  return { ...result, written };
}

describe("README language features", () => {
  it("runs line comments and block comments", async () => {
    const result = await run([
      "# ignored",
      "say \"start\" # also ignored",
      "/*",
      "ignored block",
      "*/",
      "say \"end\"",
      ""
    ].join("\n"));
    expect(result).toMatchObject({ ok: true, written: ["start", "end"] });
  });

  it("uses indentation-based blocks", async () => {
    const result = await run("if True:\n    say \"inside\"\nsay \"outside\"\n");
    expect(result).toMatchObject({ ok: true, written: ["inside", "outside"] });
  });

  it("supports global DEFINE constants", async () => {
    const result = await run("DEFINE MAX_SCORE = 100\nsay toText(MAX_SCORE)\n");
    expect(result).toMatchObject({ ok: true, written: ["100"] });
  });

  it("supports if, orif, and otherwise", async () => {
    const result = await run("score = 87\nif score >= 90:\n    say \"A\"\norif score >= 80:\n    say \"B\"\notherwise:\n    say \"C\"\n");
    expect(result).toMatchObject({ ok: true, written: ["B"] });
  });

  it("supports repeat, loopif, foreach, break, and continue", async () => {
    const result = await run([
      "total = 0",
      "repeat 3 times:",
      "    total++",
      "loopif total < 5:",
      "    total++",
      "items = [1, 2, 3, 4]",
      "foreach item in items:",
      "    if item == 2:",
      "        continue",
      "    if item == 4:",
      "        break",
      "    total += item",
      "say toText(total)",
      ""
    ].join("\n"));
    expect(result).toMatchObject({ ok: true, written: ["9"] });
  });

  it("supports functions with call-before-definition", async () => {
    const result = await run("say toText(double(6))\nnew double(value):\n    return value * 2\n");
    expect(result).toMatchObject({ ok: true, written: ["12"] });
  });

  it("supports lists, tuples, dictionaries, indexing, and collection assignment", async () => {
    const result = await run([
      "items = [1, 2]",
      "push(items, 3)",
      "items[0] = 9",
      "point = (4, 5)",
      "person = {\"name\": \"Maya\"}",
      "person[\"age\"] = 13",
      "say toText(items)",
      "say toText(point[1])",
      "say person[\"name\"]",
      "say toText(person[\"age\"])",
      ""
    ].join("\n"));
    expect(result).toMatchObject({ ok: true, written: ["[9, 2, 3]", "5", "Maya", "13"] });
  });

  it("supports attempt and when error handling", async () => {
    const result = await run("attempt:\n    value = toNumber(\"abc\")\nwhen ValueError:\n    say \"value\"\nwhen error:\n    say \"other\"\n");
    expect(result).toMatchObject({ ok: true, written: ["value"] });
  });

  it("supports documented math built-ins", async () => {
    const result = await run([
      "say toText(random(4, 4))",
      "say toText(round(3.6))",
      "say toText(floor(3.9))",
      "say toText(ceiling(3.1))",
      "say toText(absolute(-5))",
      ""
    ].join("\n"));
    expect(result).toMatchObject({ ok: true, written: ["4", "4", "3", "4", "5"] });
  });
});
