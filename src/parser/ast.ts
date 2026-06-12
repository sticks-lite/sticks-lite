import type { SticksLiteErrorName } from "../runtime/errors";

export interface SourceLocation {
  line: number;
  column: number;
}

export interface Program {
  kind: "Program";
  body: Statement[];
}

export type Statement =
  | AssignmentStatement
  | CompoundAssignmentStatement
  | IncrementStatement
  | ConstantStatement
  | SayStatement
  | IfStatement
  | RepeatStatement
  | LoopIfStatement
  | ForeachStatement
  | FunctionStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | AttemptStatement
  | ExpressionStatement;

export interface AssignmentStatement extends SourceLocation {
  kind: "AssignmentStatement";
  target: IdentifierExpression | IndexExpression;
  value: Expression;
}

export interface CompoundAssignmentStatement extends SourceLocation {
  kind: "CompoundAssignmentStatement";
  name: string;
  operator: "+=" | "-=" | "*=" | "/=" | "%=";
  value: Expression;
}

export interface IncrementStatement extends SourceLocation {
  kind: "IncrementStatement";
  name: string;
  operator: "++" | "--";
}

export interface ConstantStatement extends SourceLocation {
  kind: "ConstantStatement";
  name: string;
  value: Expression;
}

export interface SayStatement extends SourceLocation {
  kind: "SayStatement";
  expression: Expression;
}

export interface IfStatement extends SourceLocation {
  kind: "IfStatement";
  branches: Array<{ condition: Expression; body: Statement[] }>;
  otherwise?: Statement[];
}

export interface RepeatStatement extends SourceLocation {
  kind: "RepeatStatement";
  count: Expression;
  body: Statement[];
}

export interface LoopIfStatement extends SourceLocation {
  kind: "LoopIfStatement";
  condition: Expression;
  body: Statement[];
}

export interface ForeachStatement extends SourceLocation {
  kind: "ForeachStatement";
  itemName: string;
  collection: Expression;
  body: Statement[];
}

export interface FunctionStatement extends SourceLocation {
  kind: "FunctionStatement";
  name: string;
  params: string[];
  body: Statement[];
}

export interface ReturnStatement extends SourceLocation {
  kind: "ReturnStatement";
  value?: Expression;
}

export interface BreakStatement extends SourceLocation {
  kind: "BreakStatement";
}

export interface ContinueStatement extends SourceLocation {
  kind: "ContinueStatement";
}

export interface AttemptStatement extends SourceLocation {
  kind: "AttemptStatement";
  body: Statement[];
  handlers: Array<{ errorName: SticksLiteErrorName | "error"; body: Statement[]; line: number; column: number }>;
}

export interface ExpressionStatement extends SourceLocation {
  kind: "ExpressionStatement";
  expression: Expression;
}

export type Expression =
  | LiteralExpression
  | IdentifierExpression
  | UnaryExpression
  | BinaryExpression
  | CallExpression
  | IndexExpression
  | ListExpression
  | TupleExpression
  | DictionaryExpression
  | AskExpression;

export interface LiteralExpression extends SourceLocation {
  kind: "LiteralExpression";
  value: number | string | boolean | null;
}

export interface IdentifierExpression extends SourceLocation {
  kind: "IdentifierExpression";
  name: string;
}

export interface UnaryExpression extends SourceLocation {
  kind: "UnaryExpression";
  operator: "not" | "-";
  right: Expression;
}

export interface BinaryExpression extends SourceLocation {
  kind: "BinaryExpression";
  left: Expression;
  operator: "+" | "-" | "*" | "/" | "%" | "div" | "==" | "!=" | "<" | ">" | "<=" | ">=" | "and" | "or";
  right: Expression;
}

export interface CallExpression extends SourceLocation {
  kind: "CallExpression";
  callee: Expression;
  args: Expression[];
}

export interface IndexExpression extends SourceLocation {
  kind: "IndexExpression";
  object: Expression;
  index: Expression;
}

export interface ListExpression extends SourceLocation {
  kind: "ListExpression";
  elements: Expression[];
}

export interface TupleExpression extends SourceLocation {
  kind: "TupleExpression";
  elements: Expression[];
}

export interface DictionaryExpression extends SourceLocation {
  kind: "DictionaryExpression";
  entries: Array<{ key: string; value: Expression; line: number; column: number }>;
}

export interface AskExpression extends SourceLocation {
  kind: "AskExpression";
  prompt: Expression;
}
