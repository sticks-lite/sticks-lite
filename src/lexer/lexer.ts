import { KEYWORDS, type Token } from "./token";
import { SticksLiteError } from "../runtime/errors";

const SINGLE_CHAR_TOKENS: Record<string, Token["type"]> = {
  "(": "leftParen",
  ")": "rightParen",
  "[": "leftBracket",
  "]": "rightBracket",
  "{": "leftBrace",
  "}": "rightBrace",
  ",": "comma",
  ":": "colon",
  "*": "star",
  "/": "slash",
  "%": "percent"
};

export function lex(source: string): Token[] {
  const cleanSource = stripComments(source);
  const tokens: Token[] = [];
  const indentStack = [0];
  let indentStyle: "spaces" | "tabs" | null = null;

  const lines = cleanSource.replace(/\r\n?/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = lines[index];
    if (rawLine.trim().length === 0) {
      continue;
    }

    const indentMatch = rawLine.match(/^[ \t]*/);
    const indentText = indentMatch?.[0] ?? "";
    if (indentText.includes(" ") && indentText.includes("\t")) {
      throw new SticksLiteError(
        "IndentationError",
        "This line mixes tabs and spaces for indentation.",
        lineNumber,
        1,
        "Use only spaces or only tabs for indentation in one file."
      );
    }
    if (indentText.length > 0) {
      const currentStyle = indentText[0] === "\t" ? "tabs" : "spaces";
      if (indentStyle === null) {
        indentStyle = currentStyle;
      } else if (indentStyle !== currentStyle) {
        throw new SticksLiteError(
          "IndentationError",
          "This file mixes tabs and spaces for indentation.",
          lineNumber,
          1,
          "Pick one indentation style and use it consistently."
        );
      }
    }

    const indentWidth = indentText.length;
    const currentIndent = indentStack[indentStack.length - 1];
    if (indentWidth > currentIndent) {
      indentStack.push(indentWidth);
      tokens.push(makeToken("indent", "", lineNumber, 1));
    } else if (indentWidth < currentIndent) {
      while (indentWidth < indentStack[indentStack.length - 1]) {
        indentStack.pop();
        tokens.push(makeToken("dedent", "", lineNumber, 1));
      }
      if (indentWidth !== indentStack[indentStack.length - 1]) {
        throw new SticksLiteError(
          "IndentationError",
          "This indentation level does not match an earlier block.",
          lineNumber,
          1,
          "Line up this statement with the block it belongs to."
        );
      }
    }

    tokenizeLine(rawLine.slice(indentText.length), lineNumber, indentText.length + 1, tokens);
    tokens.push(makeToken("newline", "\\n", lineNumber, rawLine.length + 1));
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push(makeToken("dedent", "", lines.length, 1));
  }

  tokens.push(makeToken("eof", "", lines.length, 1));
  return tokens;
}

function stripComments(source: string): string {
  let result = "";
  let index = 0;
  let line = 1;
  let column = 1;
  let inBlockComment = false;
  let blockStart = { line: 1, column: 1 };

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (inBlockComment) {
      if (char === "/" && next === "*") {
        throw new SticksLiteError(
          "SyntaxError",
          "Nested block comments are not supported.",
          line,
          column,
          "Close the first block comment before starting another one."
        );
      }
      if (char === "*" && next === "/") {
        inBlockComment = false;
        result += "  ";
        index += 2;
        column += 2;
        continue;
      }
      if (char === "\n") {
        result += "\n";
        line += 1;
        column = 1;
      } else {
        result += " ";
        column += 1;
      }
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      blockStart = { line, column };
      result += "  ";
      index += 2;
      column += 2;
      continue;
    }

    if (char === "#") {
      while (index < source.length && source[index] !== "\n") {
        result += " ";
        index += 1;
        column += 1;
      }
      continue;
    }

    if (char === "'" || char === "\"") {
      const quote = char;
      result += char;
      index += 1;
      column += 1;
      let escaped = false;
      while (index < source.length) {
        const inner = source[index];
        result += inner;
        index += 1;
        if (inner === "\n") {
          line += 1;
          column = 1;
          escaped = false;
          continue;
        }
        column += 1;
        if (escaped) {
          escaped = false;
        } else if (inner === "\\") {
          escaped = true;
        } else if (inner === quote) {
          break;
        }
      }
      continue;
    }

    result += char;
    index += 1;
    if (char === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  if (inBlockComment) {
    throw new SticksLiteError(
      "SyntaxError",
      "This block comment was not closed.",
      blockStart.line,
      blockStart.column,
      "End the comment with `*/`."
    );
  }

  return result;
}

function tokenizeLine(line: string, lineNumber: number, startColumn: number, tokens: Token[]): void {
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    const column = startColumn + index;

    if (char === " " || char === "\t") {
      index += 1;
      continue;
    }

    const two = line.slice(index, index + 2);
    const twoCharType = twoCharToken(two);
    if (twoCharType) {
      tokens.push(makeToken(twoCharType, two, lineNumber, column));
      index += 2;
      continue;
    }

    if (SINGLE_CHAR_TOKENS[char]) {
      tokens.push(makeToken(SINGLE_CHAR_TOKENS[char], char, lineNumber, column));
      index += 1;
      continue;
    }

    if (char === "+") {
      tokens.push(makeToken("plus", char, lineNumber, column));
      index += 1;
      continue;
    }
    if (char === "-") {
      tokens.push(makeToken("minus", char, lineNumber, column));
      index += 1;
      continue;
    }
    if (char === "=") {
      tokens.push(makeToken("equal", char, lineNumber, column));
      index += 1;
      continue;
    }
    if (char === "<") {
      tokens.push(makeToken("less", char, lineNumber, column));
      index += 1;
      continue;
    }
    if (char === ">") {
      tokens.push(makeToken("greater", char, lineNumber, column));
      index += 1;
      continue;
    }

    if (isDigit(char)) {
      const start = index;
      while (isDigit(line[index])) index += 1;
      if (line[index] === "." && isDigit(line[index + 1])) {
        index += 1;
        while (isDigit(line[index])) index += 1;
      }
      const lexeme = line.slice(start, index);
      tokens.push(makeToken("number", lexeme, lineNumber, column, Number(lexeme)));
      continue;
    }

    if (char === "'" || char === "\"") {
      const quote = char;
      const start = index;
      index += 1;
      let value = "";
      let closed = false;
      while (index < line.length) {
        const inner = line[index];
        if (inner === "\\") {
          const escaped = line[index + 1];
          const mapped = escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped ?? "";
          value += mapped;
          index += 2;
          continue;
        }
        if (inner === quote) {
          index += 1;
          closed = true;
          break;
        }
        value += inner;
        index += 1;
      }
      if (!closed) {
        throw new SticksLiteError("SyntaxError", "This text value is missing its closing quote.", lineNumber, column);
      }
      tokens.push(makeToken("string", line.slice(start, index), lineNumber, column, value));
      continue;
    }

    if (isIdentifierStart(char)) {
      const start = index;
      index += 1;
      while (isIdentifierPart(line[index])) index += 1;
      const lexeme = line.slice(start, index);
      tokens.push(makeToken(KEYWORDS.has(lexeme) ? "keyword" : "identifier", lexeme, lineNumber, column));
      continue;
    }

    if (char === "!") {
      throw new SticksLiteError("SyntaxError", "`!` is not a Sticks Lite operator.", lineNumber, column, "Use `not` or `!=`.");
    }

    throw new SticksLiteError("SyntaxError", `Unexpected character \`${char}\`.`, lineNumber, column);
  }
}

function twoCharToken(value: string): Token["type"] | null {
  switch (value) {
    case "==":
      return "equalEqual";
    case "!=":
      return "bangEqual";
    case "<=":
      return "lessEqual";
    case ">=":
      return "greaterEqual";
    case "+=":
      return "plusEqual";
    case "-=":
      return "minusEqual";
    case "*=":
      return "starEqual";
    case "/=":
      return "slashEqual";
    case "%=":
      return "percentEqual";
    case "++":
      return "plusPlus";
    case "--":
      return "minusMinus";
    default:
      return null;
  }
}

function makeToken(type: Token["type"], lexeme: string, line: number, column: number, literal?: number | string): Token {
  return { type, lexeme, line, column, ...(literal !== undefined ? { literal } : {}) };
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= "0" && char <= "9";
}

function isIdentifierStart(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}
