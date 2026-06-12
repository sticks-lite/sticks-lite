import { parse } from "../parser/parser";
import type {
  AssignmentStatement,
  BinaryExpression,
  Expression,
  FunctionStatement,
  IdentifierExpression,
  IndexExpression,
  Program,
  Statement
} from "../parser/ast";
import { Environment } from "./environment";
import { BUILTIN_NAMES, PROTECTED_NAMES, createBuiltins } from "./builtins";
import { SticksLiteError, isSticksLiteError } from "./errors";
import type { RunResult, RuntimeIO } from "./io";
import {
  NULL_VALUE,
  booleanValue,
  numberValue,
  textValue,
  valueToText,
  valuesEqual,
  type SticksValue
} from "./values";

class ReturnSignal {
  constructor(readonly value: SticksValue) {}
}

class BreakSignal {}
class ContinueSignal {}

interface ExecutionContext {
  loopDepth: number;
  inFunction: boolean;
  topLevel: boolean;
}

export class Interpreter {
  private readonly globals = new Environment();
  private readonly functions = new Map<string, SticksValue>();
  private readonly builtins = createBuiltins();
  private readonly constants = new Set<string>();

  constructor(private readonly io: RuntimeIO) {}

  async run(program: Program): Promise<void> {
    this.collectFunctions(program.body);
    for (const statement of program.body) {
      if (statement.kind !== "FunctionStatement") {
        await this.execute(statement, this.globals, { loopDepth: 0, inFunction: false, topLevel: true });
      }
    }
  }

  private collectFunctions(statements: Statement[]): void {
    for (const statement of statements) {
      if (statement.kind !== "FunctionStatement") continue;
      if (PROTECTED_NAMES.has(statement.name)) {
        throw new SticksLiteError("FunctionError", `\`${statement.name}\` is a protected name.`, statement.line, statement.column);
      }
      if (this.functions.has(statement.name)) {
        throw new SticksLiteError("FunctionError", `Function \`${statement.name}\` is already defined.`, statement.line, statement.column);
      }
      this.functions.set(statement.name, { kind: "function", declaration: statement });
    }
  }

  private async execute(statement: Statement, env: Environment, context: ExecutionContext): Promise<void> {
    switch (statement.kind) {
      case "AssignmentStatement":
        await this.executeAssignment(statement, env);
        return;
      case "CompoundAssignmentStatement": {
        const current = this.lookupVariable(statement.name, env, statement.line, statement.column);
        const next = this.applyBinary(current, statement.operator[0] as BinaryExpression["operator"], await this.evaluate(statement.value, env), statement.line, statement.column);
        this.assignVariable(statement.name, next, env, statement.line, statement.column);
        return;
      }
      case "IncrementStatement": {
        const current = this.lookupVariable(statement.name, env, statement.line, statement.column);
        if (current.kind !== "number") {
          throw new SticksLiteError("TypeError", `\`${statement.name}\` must be a number to use \`${statement.operator}\`.`, statement.line, statement.column);
        }
        this.assignVariable(statement.name, numberValue(current.value + (statement.operator === "++" ? 1 : -1)), env, statement.line, statement.column);
        return;
      }
      case "ConstantStatement": {
        if (!context.topLevel) {
          throw new SticksLiteError("ConstantError", "Constants can only be defined at the top level.", statement.line, statement.column);
        }
        this.defineConstant(statement.name, await this.evaluate(statement.value, env), statement.line, statement.column);
        return;
      }
      case "SayStatement":
        this.io.writeOutput(valueToText(await this.evaluate(statement.expression, env)));
        return;
      case "IfStatement":
        for (const branch of statement.branches) {
          if (this.requireBoolean(await this.evaluate(branch.condition, env), branch.condition.line, branch.condition.column)) {
            await this.executeBlock(branch.body, env, context);
            return;
          }
        }
        if (statement.otherwise) await this.executeBlock(statement.otherwise, env, context);
        return;
      case "RepeatStatement": {
        const count = await this.evaluate(statement.count, env);
        if (count.kind !== "number" || !Number.isInteger(count.value)) {
          throw new SticksLiteError("ValueError", "`repeat` count must be a whole number.", statement.line, statement.column);
        }
        if (count.value < 0) {
          throw new SticksLiteError("ValueError", "`repeat` count cannot be negative.", statement.line, statement.column);
        }
        for (let index = 0; index < count.value; index += 1) {
          try {
            await this.executeBlock(statement.body, env, { ...context, loopDepth: context.loopDepth + 1 });
          } catch (signal) {
            if (signal instanceof BreakSignal) break;
            if (signal instanceof ContinueSignal) continue;
            throw signal;
          }
        }
        return;
      }
      case "LoopIfStatement":
        while (this.requireBoolean(await this.evaluate(statement.condition, env), statement.condition.line, statement.condition.column)) {
          try {
            await this.executeBlock(statement.body, env, { ...context, loopDepth: context.loopDepth + 1 });
          } catch (signal) {
            if (signal instanceof BreakSignal) break;
            if (signal instanceof ContinueSignal) continue;
            throw signal;
          }
        }
        return;
      case "ForeachStatement": {
        const collection = await this.evaluate(statement.collection, env);
        if (collection.kind !== "list" && collection.kind !== "tuple") {
          throw new SticksLiteError("TypeError", "`foreach` can iterate over lists and tuples in Sticks Lite v1.0.", statement.line, statement.column);
        }
        for (const item of collection.items) {
          this.assignVariable(statement.itemName, item, env, statement.line, statement.column);
          try {
            await this.executeBlock(statement.body, env, { ...context, loopDepth: context.loopDepth + 1 });
          } catch (signal) {
            if (signal instanceof BreakSignal) break;
            if (signal instanceof ContinueSignal) continue;
            throw signal;
          }
        }
        return;
      }
      case "FunctionStatement":
        return;
      case "ReturnStatement":
        if (!context.inFunction) {
          throw new SticksLiteError("RuntimeError", "`return` can only be used inside a function.", statement.line, statement.column);
        }
        throw new ReturnSignal(statement.value ? await this.evaluate(statement.value, env) : NULL_VALUE);
      case "BreakStatement":
        if (context.loopDepth === 0) {
          throw new SticksLiteError("RuntimeError", "`break` can only be used inside a loop.", statement.line, statement.column);
        }
        throw new BreakSignal();
      case "ContinueStatement":
        if (context.loopDepth === 0) {
          throw new SticksLiteError("RuntimeError", "`continue` can only be used inside a loop.", statement.line, statement.column);
        }
        throw new ContinueSignal();
      case "AttemptStatement":
        try {
          await this.executeBlock(statement.body, env, context);
        } catch (error) {
          if (!isSticksLiteError(error)) throw error;
          const handler = statement.handlers.find((candidate) => candidate.errorName === "error" || candidate.errorName === error.name);
          if (!handler) throw error;
          await this.executeBlock(handler.body, env, context);
        }
        return;
      case "ExpressionStatement":
        await this.evaluate(statement.expression, env);
        return;
    }
  }

  private async executeBlock(statements: Statement[], env: Environment, context: ExecutionContext): Promise<void> {
    for (const statement of statements) {
      await this.execute(statement, env, { ...context, topLevel: false });
    }
  }

  private async executeAssignment(statement: AssignmentStatement, env: Environment): Promise<void> {
    const value = await this.evaluate(statement.value, env);
    if (statement.target.kind === "IdentifierExpression") {
      this.assignVariable(statement.target.name, value, env, statement.line, statement.column);
      return;
    }
    await this.assignIndex(statement.target, value, env);
  }

  private async assignIndex(target: IndexExpression, value: SticksValue, env: Environment): Promise<void> {
    const object = await this.evaluate(target.object, env);
    const index = await this.evaluate(target.index, env);
    if (object.kind === "tuple") {
      throw new SticksLiteError("TypeError", "Tuples cannot be changed after creation.", target.line, target.column);
    }
    if (object.kind === "list") {
      const listIndex = this.requireIndex(index, object.items.length, target.line, target.column);
      object.items[listIndex] = value;
      return;
    }
    if (object.kind === "dictionary") {
      if (index.kind !== "text") {
        throw new SticksLiteError("TypeError", "Dictionary keys must be text.", target.line, target.column);
      }
      object.entries.set(index.value, value);
      return;
    }
    throw new SticksLiteError("TypeError", "Only lists and dictionaries can be assigned by index.", target.line, target.column);
  }

  private async evaluate(expression: Expression, env: Environment): Promise<SticksValue> {
    switch (expression.kind) {
      case "LiteralExpression":
        if (typeof expression.value === "number") return numberValue(expression.value);
        if (typeof expression.value === "string") return textValue(expression.value);
        if (typeof expression.value === "boolean") return booleanValue(expression.value);
        return NULL_VALUE;
      case "IdentifierExpression":
        return this.lookupIdentifier(expression, env);
      case "UnaryExpression": {
        const right = await this.evaluate(expression.right, env);
        if (expression.operator === "-") {
          if (right.kind !== "number") {
            throw new SticksLiteError("TypeError", "Unary `-` works only on numbers.", expression.line, expression.column);
          }
          return numberValue(-right.value);
        }
        return booleanValue(!this.requireBoolean(right, expression.line, expression.column));
      }
      case "BinaryExpression":
        if (expression.operator === "and") {
          const left = this.requireBoolean(await this.evaluate(expression.left, env), expression.left.line, expression.left.column);
          return booleanValue(left && this.requireBoolean(await this.evaluate(expression.right, env), expression.right.line, expression.right.column));
        }
        if (expression.operator === "or") {
          const left = this.requireBoolean(await this.evaluate(expression.left, env), expression.left.line, expression.left.column);
          return booleanValue(left || this.requireBoolean(await this.evaluate(expression.right, env), expression.right.line, expression.right.column));
        }
        return this.applyBinary(await this.evaluate(expression.left, env), expression.operator, await this.evaluate(expression.right, env), expression.line, expression.column);
      case "CallExpression": {
        const callee = await this.evaluate(expression.callee, env);
        const args = [];
        for (const arg of expression.args) args.push(await this.evaluate(arg, env));
        return this.callValue(callee, args, expression.line, expression.column);
      }
      case "IndexExpression": {
        const object = await this.evaluate(expression.object, env);
        const index = await this.evaluate(expression.index, env);
        return this.indexValue(object, index, expression.line, expression.column);
      }
      case "ListExpression": {
        const items = [];
        for (const element of expression.elements) items.push(await this.evaluate(element, env));
        return { kind: "list", items };
      }
      case "TupleExpression": {
        const items = [];
        for (const element of expression.elements) items.push(await this.evaluate(element, env));
        return { kind: "tuple", items };
      }
      case "DictionaryExpression": {
        const entries = new Map<string, SticksValue>();
        for (const entry of expression.entries) {
          entries.set(entry.key, await this.evaluate(entry.value, env));
        }
        return { kind: "dictionary", entries };
      }
      case "AskExpression": {
        const prompt = await this.evaluate(expression.prompt, env);
        if (prompt.kind !== "text") {
          throw new SticksLiteError("TypeError", "`ask` prompt must be text.", expression.line, expression.column);
        }
        return textValue(await this.io.readInput(prompt.value));
      }
    }
  }

  private lookupIdentifier(expression: IdentifierExpression, env: Environment): SticksValue {
    return this.lookupVariable(expression.name, env, expression.line, expression.column);
  }

  private lookupVariable(name: string, env: Environment, line: number, column: number): SticksValue {
    if (env.values.has(name)) return env.values.get(name)!;
    if (env.parent?.values.has(name)) return env.parent.values.get(name)!;
    if (this.functions.has(name)) return this.functions.get(name)!;
    if (this.builtins.has(name)) return this.builtins.get(name)!;
    throw new SticksLiteError("NameError", `\`${name}\` does not exist yet.`, line, column, `Create it first with \`${name} = ...\`.`);
  }

  private assignVariable(name: string, value: SticksValue, env: Environment, line: number, column: number): void {
    if (this.constants.has(name)) {
      throw new SticksLiteError("ConstantError", `\`${name}\` is a constant and cannot be changed.`, line, column);
    }
    if (BUILTIN_NAMES.has(name) || this.functions.has(name) || PROTECTED_NAMES.has(name)) {
      throw new SticksLiteError("NameError", `\`${name}\` is a protected name and cannot be overwritten.`, line, column);
    }
    env.values.set(name, value);
  }

  private defineConstant(name: string, value: SticksValue, line: number, column: number): void {
    if (this.globals.values.has(name) || this.constants.has(name)) {
      throw new SticksLiteError("ConstantError", `Constant \`${name}\` is already defined.`, line, column);
    }
    if (this.functions.has(name) || PROTECTED_NAMES.has(name)) {
      throw new SticksLiteError("ConstantError", `\`${name}\` is a protected name and cannot be used for a constant.`, line, column);
    }
    this.globals.values.set(name, value);
    this.constants.add(name);
  }

  private async callValue(callee: SticksValue, args: SticksValue[], line: number, column: number): Promise<SticksValue> {
    if (callee.kind === "builtin") {
      return callee.call(args, line, column);
    }
    if (callee.kind !== "function") {
      throw new SticksLiteError("FunctionError", "Only functions can be called.", line, column);
    }
    const declaration: FunctionStatement = callee.declaration;
    if (args.length !== declaration.params.length) {
      throw new SticksLiteError(
        "ArgumentError",
        `\`${declaration.name}\` expects ${declaration.params.length} argument${declaration.params.length === 1 ? "" : "s"}, but got ${args.length}.`,
        line,
        column
      );
    }
    const local = new Environment(this.globals, true);
    declaration.params.forEach((param, index) => {
      local.values.set(param, args[index]);
    });
    try {
      await this.executeBlock(declaration.body, local, { loopDepth: 0, inFunction: true, topLevel: false });
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value;
      throw signal;
    }
    return NULL_VALUE;
  }

  private applyBinary(left: SticksValue, operator: BinaryExpression["operator"], right: SticksValue, line: number, column: number): SticksValue {
    if (operator === "==" || operator === "!=") {
      const equal = valuesEqual(left, right);
      return booleanValue(operator === "==" ? equal : !equal);
    }

    if (["<", ">", "<=", ">="].includes(operator)) {
      if (left.kind !== "number" || right.kind !== "number") {
        throw new SticksLiteError("TypeError", `\`${operator}\` compares numbers.`, line, column);
      }
      if (operator === "<") return booleanValue(left.value < right.value);
      if (operator === ">") return booleanValue(left.value > right.value);
      if (operator === "<=") return booleanValue(left.value <= right.value);
      return booleanValue(left.value >= right.value);
    }

    if (operator === "+" && left.kind === "text" && right.kind === "text") {
      return textValue(left.value + right.value);
    }

    if (left.kind !== "number" || right.kind !== "number") {
      throw new SticksLiteError("TypeError", `\`${operator}\` works on numbers${operator === "+" ? " or two text values" : ""}.`, line, column);
    }
    switch (operator) {
      case "+":
        return numberValue(left.value + right.value);
      case "-":
        return numberValue(left.value - right.value);
      case "*":
        return numberValue(left.value * right.value);
      case "/":
        if (right.value === 0) throw new SticksLiteError("MathError", "Division by zero is not allowed.", line, column);
        return numberValue(left.value / right.value);
      case "%":
        if (right.value === 0) throw new SticksLiteError("MathError", "Modulo by zero is not allowed.", line, column);
        return numberValue(left.value % right.value);
      case "div":
        if (right.value === 0) throw new SticksLiteError("MathError", "Integer division by zero is not allowed.", line, column);
        return numberValue(Math.trunc(left.value / right.value));
      default:
        throw new SticksLiteError("RuntimeError", `Unsupported operator \`${operator}\`.`, line, column);
    }
  }

  private indexValue(object: SticksValue, index: SticksValue, line: number, column: number): SticksValue {
    if (object.kind === "list" || object.kind === "tuple") {
      return object.items[this.requireIndex(index, object.items.length, line, column)];
    }
    if (object.kind === "dictionary") {
      if (index.kind !== "text") {
        throw new SticksLiteError("TypeError", "Dictionary keys must be text.", line, column);
      }
      const value = object.entries.get(index.value);
      if (value === undefined) {
        throw new SticksLiteError("KeyError", `Dictionary key \`${index.value}\` does not exist.`, line, column);
      }
      return value;
    }
    if (object.kind === "text") {
      const textIndex = this.requireIndex(index, object.value.length, line, column);
      return textValue(object.value[textIndex]);
    }
    throw new SticksLiteError("TypeError", "Only text, lists, tuples, and dictionaries support indexing.", line, column);
  }

  private requireIndex(value: SticksValue, length: number, line: number, column: number): number {
    if (value.kind !== "number" || !Number.isInteger(value.value)) {
      throw new SticksLiteError("IndexError", "Indexes must be whole numbers.", line, column);
    }
    if (value.value < 0 || value.value >= length) {
      throw new SticksLiteError("IndexError", `Index ${value.value} is outside the valid range.`, line, column);
    }
    return value.value;
  }

  private requireBoolean(value: SticksValue, line: number, column: number): boolean {
    if (value.kind !== "boolean") {
      throw new SticksLiteError("TypeError", "Conditions must be `True` or `False`.", line, column, "Compare values explicitly, such as `score > 0`.");
    }
    return value.value;
  }
}

export async function runSource(source: string, io?: RuntimeIO): Promise<RunResult> {
  const output: string[] = [];
  const runtimeIO: RuntimeIO = {
    readInput: io?.readInput ?? (() => ""),
    writeOutput(text: string) {
      output.push(text);
      io?.writeOutput(text);
    }
  };

  try {
    const program = parse(source);
    const interpreter = new Interpreter(runtimeIO);
    await interpreter.run(program);
    return { ok: true, output };
  } catch (error) {
    if (isSticksLiteError(error)) {
      return { ok: false, output, error: error.format() };
    }
    throw error;
  }
}
