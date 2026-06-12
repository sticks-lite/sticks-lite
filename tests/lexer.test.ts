import { describe, expect, it } from "vitest";
import { lex } from "../src";

describe("lexer", () => {
  it("tokenizes identifiers, keywords, numbers, strings, and operators", () => {
    const tokens = lex('DEFINE score = 42\nsay "Score: " + toText(score)\n');
    expect(tokens.map((token) => token.lexeme).filter(Boolean)).toEqual([
      "DEFINE",
      "score",
      "=",
      "42",
      "\\n",
      "say",
      "\"Score: \"",
      "+",
      "toText",
      "(",
      "score",
      ")",
      "\\n"
    ]);
  });

  it("emits indentation tokens for blocks", () => {
    const tokens = lex("if True:\n    say 'yes'\nsay 'done'\n");
    expect(tokens.map((token) => token.type)).toContain("indent");
    expect(tokens.map((token) => token.type)).toContain("dedent");
  });

  it("ignores single-line and block comments", () => {
    const tokens = lex("# ignore\nx = 1 /* block */ + 2\n");
    expect(tokens.map((token) => token.lexeme)).not.toContain("#");
    expect(tokens.map((token) => token.lexeme)).toContain("x");
    expect(tokens.map((token) => token.lexeme)).toContain("+");
  });

  it("rejects mixed indentation", () => {
    expectErrorName(() => lex("if True:\n    say 'spaces'\n\tsay 'tab'\n"), "IndentationError");
  });

  it("rejects nested block comments", () => {
    expect(() => lex("/* outer /* inner */ */\n")).toThrow(/Nested block comments/);
  });
});

function expectErrorName(action: () => unknown, name: string) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe(name);
    return;
  }
  throw new Error(`Expected ${name}`);
}
