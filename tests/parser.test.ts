import { describe, expect, it } from "vitest";
import { parse } from "../src";

describe("parser", () => {
  it("parses assignments and say statements", () => {
    const program = parse("score = 10\nsay toText(score)\n");
    expect(program.body.map((statement) => statement.kind)).toEqual(["AssignmentStatement", "SayStatement"]);
  });

  it("parses conditionals with orif and otherwise", () => {
    const program = parse("if score >= 90:\n    say 'A'\norif score >= 80:\n    say 'B'\notherwise:\n    say 'C'\n");
    const statement = program.body[0];
    expect(statement.kind).toBe("IfStatement");
    if (statement.kind === "IfStatement") {
      expect(statement.branches).toHaveLength(2);
      expect(statement.otherwise).toHaveLength(1);
    }
  });

  it("parses function definitions and calls", () => {
    const program = parse("new double(x):\n    return x * 2\nsay toText(double(5))\n");
    expect(program.body[0].kind).toBe("FunctionStatement");
    expect(program.body[1].kind).toBe("SayStatement");
  });

  it("parses lists, tuples, and dictionaries", () => {
    const program = parse("items = [1, 2]\npoint = (1, 2)\nperson = {\"name\": \"Maya\"}\n");
    expect(program.body).toHaveLength(3);
  });

  it("rejects standalone orif", () => {
    expect(() => parse("orif True:\n    say 'bad'\n")).toThrow(/orif/);
  });

  it("rejects no-parameter function parentheses", () => {
    expect(() => parse("new greet():\n    say 'hi'\n")).toThrow(/No-parameter/);
  });
});
