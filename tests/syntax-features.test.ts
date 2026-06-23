import { describe, expect, it } from "vitest";
import { parse, runSource } from "../src";

async function run(source: string, inputs: string[] = []) {
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

describe("all syntax features", () => {
  it("parses every statement family in one program", () => {
    const program = parse([
      "DEFINE LIMIT = 3",
      "count = 0",
      "say \"start\"",
      "if True:",
      "    say \"if\"",
      "orif False:",
      "    say \"orif\"",
      "otherwise:",
      "    say \"otherwise\"",
      "repeat LIMIT times:",
      "    count++",
      "loopif count > 0:",
      "    count--",
      "foreach item in [1, 2]:",
      "    say toText(item)",
      "attempt:",
      "    value = toNumber(\"bad\")",
      "when ValueError:",
      "    say \"handled\"",
      "new double(value):",
      "    return value * 2",
      "say toText(double(4))",
      ""
    ].join("\n"));

    expect(program.body.map((statement) => statement.kind)).toEqual([
      "ConstantStatement",
      "AssignmentStatement",
      "SayStatement",
      "IfStatement",
      "RepeatStatement",
      "LoopIfStatement",
      "ForeachStatement",
      "AttemptStatement",
      "FunctionStatement",
      "SayStatement"
    ]);
  });

  it("runs comments, indentation, constants, conditionals, loops, functions, collections, and errors together", async () => {
    const result = await run([
      "# line comments are ignored",
      "/* block comments are ignored */",
      "DEFINE PASSING = 70",
      "scores = [88, 91, 67]",
      "labels = {\"passed\": 0, \"checked\": True}",
      "total = 0",
      "foreach score in scores:",
      "    total += score",
      "    if score >= PASSING:",
      "        passed = labels[\"passed\"] + 1",
      "        labels[\"passed\"] = passed",
      "average = total / length(scores)",
      "if average >= 90:",
      "    grade = \"A\"",
      "orif average >= 80:",
      "    grade = \"B\"",
      "otherwise:",
      "    grade = \"Practice\"",
      "repeat 2 times:",
      "    passed = labels[\"passed\"] + 1",
      "    labels[\"passed\"] = passed",
      "loopif labels[\"passed\"] > 3:",
      "    passed = labels[\"passed\"] - 1",
      "    labels[\"passed\"] = passed",
      "attempt:",
      "    value = toNumber(\"not a number\")",
      "when ValueError:",
      "    value = double(2)",
      "new double(value):",
      "    return value * 2",
      "say grade",
      "say toText(labels[\"passed\"])",
      "say toText(value)",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["B", "3", "4"] });
  });

  it("runs expressions across precedence, booleans, unary operators, indexing, and calls", async () => {
    const result = await run([
      "items = [1, 2, 3]",
      "point = (10, 20)",
      "student = {\"name\": \"Maya\", \"active\": True}",
      "flag = student[\"active\"] and not False",
      "say toText((2 + 3) * 4 == 20 and flag)",
      "say toText(items[0] + point[1])",
      "say student[\"name\"]",
      ""
    ].join("\n"));

    expect(result).toMatchObject({ ok: true, output: ["True", "21", "Maya"] });
  });

  it("runs ask input as syntax, not as a normal function call", async () => {
    const result = await run("name = ask \"Name?\"\nsay \"Hello \" + name\n", ["Ari"]);
    expect(result).toMatchObject({ ok: true, output: ["Hello Ari"] });
  });
});
