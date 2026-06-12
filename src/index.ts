export { lex } from "./lexer/lexer";
export type { Token, TokenType } from "./lexer/token";
export { parse, parseTokens } from "./parser/parser";
export type { Program, Statement, Expression } from "./parser/ast";
export { Interpreter, runSource } from "./runtime/interpreter";
export type { RuntimeIO, RunResult } from "./runtime/io";
export { SticksLiteError, isSticksLiteError } from "./runtime/errors";
export type { SticksLiteErrorName } from "./runtime/errors";
export type { SticksValue } from "./runtime/values";
