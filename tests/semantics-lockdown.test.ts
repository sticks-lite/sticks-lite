import { describe, expect, it } from "vitest";
import { runSource } from "../src";

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

describe("language semantics lockdown", () => {
  it("locks list indexing, nested indexing, length, and text indexing semantics", async () => {
    const result = await run([
      "items = [10, 20, [30, 40]]",
      "say toText(items[0])",
      "say toText(items[2][1])",
      "say toText(length(items))",
      "word = \"Sticks\"",
      "say word[0]",
      "say word[5]",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["10", "40", "3", "S", "s"] });
  });

  it("locks tuple indexing, nested tuples, and tuple immutability", async () => {
    const result = await run([
      "point = (10, (20, 30))",
      "say toText(point[0])",
      "say toText(point[1][0])",
      "say toText(length(point))",
      ""
    ].join("\n"));
    expect(result).toMatchObject({ ok: true, output: ["10", "20", "2"] });

    const error = await errorFor("point = (1, 2)\npoint[0] = 9\n");
    expect(error).toContain("Tuples cannot be changed");
  });

  it("locks dictionary indexing, mutation, nested values, and missing-key behavior", async () => {
    const result = await run([
      "student = {\"name\": \"Maya\", \"scores\": [8, 9]}",
      "say student[\"name\"]",
      "say toText(student[\"scores\"][1])",
      "student[\"grade\"] = \"A\"",
      "student[\"scores\"][0] = 10",
      "say student[\"grade\"]",
      "say toText(student[\"scores\"])",
      "say toText(length(student))",
      ""
    ].join("\n"));
    expect(result).toMatchObject({ ok: true, output: ["Maya", "9", "A", "[10, 9]", "3"] });

    await expect(errorFor("student = {\"name\": \"Maya\"}\nsay student[\"age\"]\n")).resolves.toContain("KeyError");
    await expect(errorFor("student = {\"name\": \"Maya\"}\nsay student[0]\n")).resolves.toContain("Dictionary keys must be text");
  });

  it("locks mutable collection assignment rules for lists and dictionaries", async () => {
    const result = await run([
      "items = [1, 2, 3]",
      "items[1] = 20",
      "matrix = [[1, 2], [3, 4]]",
      "matrix[1][0] = 30",
      "person = {\"name\": \"Maya\"}",
      "person[\"name\"] = \"Ari\"",
      "person[\"city\"] = \"Ridgewood\"",
      "say toText(items)",
      "say toText(matrix)",
      "say person[\"name\"]",
      "say person[\"city\"]",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["[1, 20, 3]", "[[1, 2], [30, 4]]", "Ari", "Ridgewood"] });
    await expect(errorFor("word = \"abc\"\nword[0] = \"A\"\n")).resolves.toContain("Only lists and dictionaries can be assigned by index");
  });

  it("locks function calls, nested calls, early returns, null returns, and local scope", async () => {
    const result = await run([
      "say toText(add(double(2), double(3)))",
      "say choose(True)",
      "say toText(noReturn())",
      "new double(value):",
      "    return value * 2",
      "new add(left, right):",
      "    return left + right",
      "new choose(flag):",
      "    if flag:",
      "        return \"yes\"",
      "    return \"no\"",
      "new noReturn:",
      "    temp = 5",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["10", "yes", "null"] });
    await expect(errorFor("new setLocal:\n    local = 7\nsetLocal()\nsay toText(local)\n")).resolves.toContain("NameError");
  });

  it("locks wrong function parameter count errors", async () => {
    const tooFew = await errorFor("new greet(name):\n    say name\ngreet()\n");
    expect(tooFew).toContain("expects 1 argument");
    expect(tooFew).toContain("greet(name)");

    const tooMany = await errorFor("new greet:\n    say \"hi\"\ngreet(\"Maya\")\n");
    expect(tooMany).toContain("expects 0 arguments");
    expect(tooMany).toContain("greet()");
  });

  it("locks protected built-ins, error names, constants, and functions", async () => {
    await expect(errorFor("random = 5\n")).resolves.toContain("protected built-in function name");
    await expect(errorFor("NameError = 5\n")).resolves.toContain("protected error name");
    await expect(errorFor("DEFINE length = 5\n")).resolves.toContain("protected built-in function name");
    await expect(errorFor("DEFINE RuntimeError = \"bad\"\n")).resolves.toContain("protected error name");

    const constantError = await errorFor("DEFINE PI = 3.14\nPI = 4\n");
    expect(constantError).toContain("constant and cannot be changed");

    const functionOverwrite = await errorFor("new helper:\n    return 1\nhelper = 2\n");
    expect(functionOverwrite).toContain("protected function name");

    const functionProtected = await errorFor("new toText(value):\n    return value\n");
    expect(functionProtected).toContain("protected built-in function name");

    const duplicateFunction = await errorFor("new helper:\n    return 1\nnew helper:\n    return 2\n");
    expect(duplicateFunction).toContain("already defined");

    const constantFunctionConflict = await errorFor("DEFINE LIMIT = 3\nnew LIMIT:\n    return 4\n");
    expect(constantFunctionConflict).toContain("protected function name");
  });
});
