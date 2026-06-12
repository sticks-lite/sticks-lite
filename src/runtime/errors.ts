export type SticksLiteErrorName =
  | "SyntaxError"
  | "IndentationError"
  | "NameError"
  | "TypeError"
  | "ValueError"
  | "MathError"
  | "ConstantError"
  | "IndexError"
  | "KeyError"
  | "FunctionError"
  | "ArgumentError"
  | "RuntimeError";

export class SticksLiteError extends Error {
  readonly line: number;
  readonly column: number;
  readonly hint?: string;

  constructor(name: SticksLiteErrorName, message: string, line = 1, column = 1, hint?: string) {
    super(message);
    this.name = name;
    this.line = line;
    this.column = column;
    this.hint = hint;
  }

  format(): string {
    const location = `${this.name} at line ${this.line}, column ${this.column}: ${this.message}`;
    return this.hint ? `${location}\nHint: ${this.hint}` : location;
  }
}

export function isSticksLiteError(error: unknown): error is SticksLiteError {
  return error instanceof SticksLiteError;
}
