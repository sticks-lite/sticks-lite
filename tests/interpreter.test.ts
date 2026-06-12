import { describe, expect, it } from "vitest";
import { runSource } from "../src";

async function outputOf(source: string, inputs: string[] = []) {
  const output: string[] = [];
  const result = await runSource(source, {
    readInput() {
      return inputs.shift() ?? "";
    },
    writeOutput(text) {
      output.push(text);
    }
  });
  return { ...result, output };
}

describe("interpreter", () => {
  it("runs hello world", async () => {
    await expect(outputOf('say "Hello, world!"\n')).resolves.toMatchObject({ ok: true, output: ["Hello, world!"] });
  });

  it("calls functions before definition", async () => {
    const source = "say toText(double(5))\n\nnew double(x):\n    return x * 2\n";
    await expect(outputOf(source)).resolves.toMatchObject({ ok: true, output: ["10"] });
  });

  it("handles variables, compound assignment, and increment", async () => {
    const source = "score = 0\nscore += 10\nscore++\nsay toText(score)\n";
    await expect(outputOf(source)).resolves.toMatchObject({ ok: true, output: ["11"] });
  });

  it("protects global constants", async () => {
    const source = "DEFINE PI = 3.14\nsay toText(PI)\n";
    await expect(outputOf(source)).resolves.toMatchObject({ ok: true, output: ["3.14"] });
  });

  it("keeps block variables in the same scope and function variables local", async () => {
    const source = [
      "if True:",
      "    x = 5",
      "say toText(x)",
      "new make:",
      "    y = 7",
      "make()",
      "attempt:",
      "    say toText(y)",
      "when NameError:",
      "    say \"local\"",
      ""
    ].join("\n");
    await expect(outputOf(source)).resolves.toMatchObject({ ok: true, output: ["5", "local"] });
  });

  it("uses arithmetic precedence and integer division", async () => {
    const source = "say toText(2 + 3 * 4)\nsay toText(5 div 2)\n";
    await expect(outputOf(source)).resolves.toMatchObject({ ok: true, output: ["14", "2"] });
  });

  it("requires explicit text conversion for string concatenation", async () => {
    const result = await outputOf('score = 10\nsay "Score: " + score\n');
    expect(result.ok).toBe(false);
    expect(result.error).toContain("TypeError");
  });

  it("requires boolean conditions", async () => {
    const result = await outputOf("score = 10\nif score:\n    say 'bad'\n");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Conditions must be `True` or `False`");
  });

  it("runs repeat, loopif, break, and continue", async () => {
    const source = [
      "score = 0",
      "repeat 5 times:",
      "    score++",
      "    if score == 2:",
      "        continue",
      "    if score == 4:",
      "        break",
      "say toText(score)",
      "loopif score > 0:",
      "    score--",
      "say toText(score)",
      ""
    ].join("\n");
    await expect(outputOf(source)).resolves.toMatchObject({ ok: true, output: ["4", "0"] });
  });

  it("runs foreach over lists and leaves the loop variable available", async () => {
    const source = "scores = [2, 3, 4]\ntotal = 0\nforeach score in scores:\n    total += score\nsay toText(total)\nsay toText(score)\n";
    await expect(outputOf(source)).resolves.toMatchObject({ ok: true, output: ["9", "4"] });
  });

  it("supports lists, tuples, dictionaries, and data built-ins", async () => {
    const source = [
      "items = [1, 2]",
      "push(items, 3)",
      "insert(items, 1, 9)",
      "remove(items, 0)",
      "point = (10, 20)",
      "person = {\"name\": \"Maya\"}",
      "person[\"age\"] = 13",
      "say toText(items)",
      "say toText(point[1])",
      "say person[\"name\"]",
      "say toText(length(person))",
      ""
    ].join("\n");
    await expect(outputOf(source)).resolves.toMatchObject({ ok: true, output: ["[9, 2, 3]", "20", "Maya", "2"] });
  });

  it("supports ask through runtime I/O", async () => {
    const source = "name = ask \"Name?\"\nsay \"Hello \" + name\n";
    await expect(outputOf(source, ["Maya"])).resolves.toMatchObject({ ok: true, output: ["Hello Maya"] });
  });

  it("handles attempt and when", async () => {
    const source = "attempt:\n    value = toNumber(\"abc\")\nwhen ValueError:\n    say \"bad\"\nwhen error:\n    say \"other\"\n";
    await expect(outputOf(source)).resolves.toMatchObject({ ok: true, output: ["bad"] });
  });

  it("rejects dictionary iteration in v1", async () => {
    const result = await outputOf("person = {\"name\": \"Maya\"}\nforeach key in person:\n    say key\n");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("lists and tuples");
  });
});
