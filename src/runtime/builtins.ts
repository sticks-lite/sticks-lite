import { ERROR_NAMES } from "../lexer/token";
import { SticksLiteError } from "./errors";
import {
  NULL_VALUE,
  booleanValue,
  numberValue,
  textValue,
  valueToText,
  type BuiltinCallable,
  type SticksValue
} from "./values";

export const BUILTIN_NAMES = new Set([
  "random",
  "length",
  "toNumber",
  "toText",
  "isNumber",
  "isText",
  "isList",
  "isTuple",
  "isDictionary",
  "isBoolean",
  "isNull",
  "push",
  "insert",
  "remove",
  "round",
  "floor",
  "ceiling",
  "absolute"
]);

export const PROTECTED_NAMES = new Set([...BUILTIN_NAMES, ...ERROR_NAMES]);

export function createBuiltins(): Map<string, SticksValue> {
  const builtins = new Map<string, SticksValue>();
  for (const [name, call] of Object.entries(BUILTIN_CALLS)) {
    builtins.set(name, { kind: "builtin", name, call });
  }
  return builtins;
}

const BUILTIN_CALLS: Record<string, BuiltinCallable> = {
  random(args, line, column) {
    expectCount("random", args, 2, line, column);
    const min = expectNumber("random", args[0], 1, line, column);
    const max = expectNumber("random", args[1], 2, line, column);
    if (min > max) {
      throw new SticksLiteError("ValueError", "`random` needs the minimum to be less than or equal to the maximum.", line, column, "Swap the two arguments, for example `random(1, 6)`.");
    }
    if (Number.isInteger(min) && Number.isInteger(max)) {
      return numberValue(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return numberValue(Math.random() * (max - min) + min);
  },

  length(args, line, column) {
    expectCount("length", args, 1, line, column);
    const value = args[0];
    if (value.kind === "text") return numberValue(value.value.length);
    if (value.kind === "list" || value.kind === "tuple") return numberValue(value.items.length);
    if (value.kind === "dictionary") return numberValue(value.entries.size);
    throw new SticksLiteError("TypeError", `\`length\` works on text, lists, tuples, and dictionaries, not ${typeName(value)}.`, line, column, "Pass text or a collection, such as `length(\"hello\")` or `length([1, 2, 3])`.");
  },

  toNumber(args, line, column) {
    expectCount("toNumber", args, 1, line, column);
    const value = args[0];
    if (value.kind === "number") return value;
    if (value.kind !== "text") {
      throw new SticksLiteError("TypeError", `\`toNumber\` converts text into a number, not ${typeName(value)}.`, line, column, "Pass text like `\"42\"`, for example `toNumber(\"42\")`.");
    }
    const converted = Number(value.value.trim());
    if (!Number.isFinite(converted) || value.value.trim() === "") {
      throw new SticksLiteError("ValueError", `\`${value.value}\` cannot be converted to a number.`, line, column, "Use text that contains only a number, such as `\"42\"` or `\"3.14\"`.");
    }
    return numberValue(converted);
  },

  toText(args, line, column) {
    expectCount("toText", args, 1, line, column);
    return textValue(valueToText(args[0]));
  },

  isNumber(args, line, column) {
    expectCount("isNumber", args, 1, line, column);
    return booleanValue(args[0].kind === "number");
  },

  isText(args, line, column) {
    expectCount("isText", args, 1, line, column);
    return booleanValue(args[0].kind === "text");
  },

  isList(args, line, column) {
    expectCount("isList", args, 1, line, column);
    return booleanValue(args[0].kind === "list");
  },

  isTuple(args, line, column) {
    expectCount("isTuple", args, 1, line, column);
    return booleanValue(args[0].kind === "tuple");
  },

  isDictionary(args, line, column) {
    expectCount("isDictionary", args, 1, line, column);
    return booleanValue(args[0].kind === "dictionary");
  },

  isBoolean(args, line, column) {
    expectCount("isBoolean", args, 1, line, column);
    return booleanValue(args[0].kind === "boolean");
  },

  isNull(args, line, column) {
    expectCount("isNull", args, 1, line, column);
    return booleanValue(args[0].kind === "null");
  },

  push(args, line, column) {
    expectCount("push", args, 2, line, column);
    const list = expectList("push", args[0], 1, line, column);
    list.items.push(args[1]);
    return NULL_VALUE;
  },

  insert(args, line, column) {
    expectCount("insert", args, 3, line, column);
    const list = expectList("insert", args[0], 1, line, column);
    const index = expectWholeNumber("insert", args[1], 2, line, column);
    if (index < 0 || index > list.items.length) {
      throw new SticksLiteError("IndexError", `Index ${index} is outside this list.`, line, column, `Use an index from 0 through ${list.items.length}; for example \`insert(items, 0, value)\`.`);
    }
    list.items.splice(index, 0, args[2]);
    return NULL_VALUE;
  },

  remove(args, line, column) {
    expectCount("remove", args, 2, line, column);
    const list = expectList("remove", args[0], 1, line, column);
    const index = expectWholeNumber("remove", args[1], 2, line, column);
    if (index < 0 || index >= list.items.length) {
      const hint = list.items.length === 0 ? "This list is empty, so there is nothing to remove." : `Use an index from 0 through ${list.items.length - 1}; for example \`remove(items, 0)\`.`;
      throw new SticksLiteError("IndexError", `Index ${index} is outside this list.`, line, column, hint);
    }
    list.items.splice(index, 1);
    return NULL_VALUE;
  },

  round(args, line, column) {
    expectCount("round", args, 1, line, column);
    return numberValue(Math.round(expectNumber("round", args[0], 1, line, column)));
  },

  floor(args, line, column) {
    expectCount("floor", args, 1, line, column);
    return numberValue(Math.floor(expectNumber("floor", args[0], 1, line, column)));
  },

  ceiling(args, line, column) {
    expectCount("ceiling", args, 1, line, column);
    return numberValue(Math.ceil(expectNumber("ceiling", args[0], 1, line, column)));
  },

  absolute(args, line, column) {
    expectCount("absolute", args, 1, line, column);
    return numberValue(Math.abs(expectNumber("absolute", args[0], 1, line, column)));
  }
};

function expectCount(name: string, args: SticksValue[], count: number, line: number, column: number): void {
  if (args.length !== count) {
    throw new SticksLiteError(
      "ArgumentError",
      `\`${name}\` expects ${count} argument${count === 1 ? "" : "s"}, but got ${args.length}.`,
      line,
      column,
      `Check the values inside \`${name}(...)\` and pass exactly ${count}. Example: \`${builtinExample(name)}\`.`
    );
  }
}

function expectNumber(name: string, value: SticksValue, position: number, line: number, column: number): number {
  if (value.kind !== "number") {
    throw new SticksLiteError("TypeError", `Argument ${position} to \`${name}\` must be a number, not ${typeName(value)}.`, line, column, `Convert text input with \`toNumber(...)\`, or call it like \`${builtinExample(name)}\`.`);
  }
  return value.value;
}

function expectWholeNumber(name: string, value: SticksValue, position: number, line: number, column: number): number {
  const number = expectNumber(name, value, position, line, column);
  if (!Number.isInteger(number)) {
    throw new SticksLiteError("ValueError", `Argument ${position} to \`${name}\` must be a whole number.`, line, column, "Use values like `0`, `1`, or `2`, not decimals.");
  }
  return number;
}

function expectList(name: string, value: SticksValue, position: number, line: number, column: number): Extract<SticksValue, { kind: "list" }> {
  if (value.kind !== "list") {
    throw new SticksLiteError("TypeError", `Argument ${position} to \`${name}\` must be a list, not ${typeName(value)}.`, line, column, `List operations use square-bracket lists such as \`[1, 2, 3]\`. Example: \`${builtinExample(name)}\`.`);
  }
  return value;
}

function builtinExample(name: string): string {
  switch (name) {
    case "random":
      return "random(1, 6)";
    case "length":
      return "length([1, 2, 3])";
    case "toNumber":
      return "toNumber(\"42\")";
    case "toText":
      return "toText(42)";
    case "push":
      return "push(items, 4)";
    case "insert":
      return "insert(items, 0, 4)";
    case "remove":
      return "remove(items, 0)";
    case "round":
      return "round(3.5)";
    case "floor":
      return "floor(3.9)";
    case "ceiling":
      return "ceiling(3.1)";
    case "absolute":
      return "absolute(-5)";
    default:
      return `${name}(value)`;
  }
}

function typeName(value: SticksValue): string {
  if (value.kind === "builtin") return "built-in function";
  if (value.kind === "function") return "function";
  return value.kind;
}
