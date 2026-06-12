export type TokenType =
  | "number"
  | "string"
  | "identifier"
  | "keyword"
  | "newline"
  | "indent"
  | "dedent"
  | "eof"
  | "leftParen"
  | "rightParen"
  | "leftBracket"
  | "rightBracket"
  | "leftBrace"
  | "rightBrace"
  | "comma"
  | "colon"
  | "plus"
  | "minus"
  | "star"
  | "slash"
  | "percent"
  | "equal"
  | "equalEqual"
  | "bangEqual"
  | "less"
  | "lessEqual"
  | "greater"
  | "greaterEqual"
  | "plusEqual"
  | "minusEqual"
  | "starEqual"
  | "slashEqual"
  | "percentEqual"
  | "plusPlus"
  | "minusMinus";

export interface Token {
  type: TokenType;
  lexeme: string;
  literal?: number | string;
  line: number;
  column: number;
}

export const KEYWORDS = new Set([
  "DEFINE",
  "if",
  "orif",
  "otherwise",
  "repeat",
  "times",
  "loopif",
  "foreach",
  "in",
  "break",
  "continue",
  "new",
  "return",
  "True",
  "False",
  "null",
  "and",
  "or",
  "not",
  "div",
  "say",
  "ask",
  "attempt",
  "when",
  "error"
]);

export const ERROR_NAMES = new Set([
  "SyntaxError",
  "IndentationError",
  "NameError",
  "TypeError",
  "ValueError",
  "MathError",
  "ConstantError",
  "IndexError",
  "KeyError",
  "FunctionError",
  "ArgumentError",
  "RuntimeError"
]);
