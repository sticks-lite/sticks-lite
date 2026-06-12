import type { FunctionStatement } from "../parser/ast";

export type SticksValue =
  | { kind: "number"; value: number }
  | { kind: "text"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "null"; value: null }
  | { kind: "list"; items: SticksValue[] }
  | { kind: "tuple"; items: SticksValue[] }
  | { kind: "dictionary"; entries: Map<string, SticksValue> }
  | { kind: "function"; declaration: FunctionStatement }
  | { kind: "builtin"; name: string; call: BuiltinCallable };

export type BuiltinCallable = (args: SticksValue[], line: number, column: number) => SticksValue;

export const NULL_VALUE: SticksValue = { kind: "null", value: null };

export function numberValue(value: number): SticksValue {
  return { kind: "number", value };
}

export function textValue(value: string): SticksValue {
  return { kind: "text", value };
}

export function booleanValue(value: boolean): SticksValue {
  return { kind: "boolean", value };
}

export function cloneValue(value: SticksValue): SticksValue {
  if (value.kind === "list") {
    return { kind: "list", items: value.items.map(cloneValue) };
  }
  if (value.kind === "tuple") {
    return { kind: "tuple", items: value.items.map(cloneValue) };
  }
  if (value.kind === "dictionary") {
    return { kind: "dictionary", entries: new Map([...value.entries].map(([key, item]) => [key, cloneValue(item)])) };
  }
  return value;
}

export function valueToText(value: SticksValue): string {
  switch (value.kind) {
    case "number":
      return Number.isInteger(value.value) ? value.value.toString() : String(value.value);
    case "text":
      return value.value;
    case "boolean":
      return value.value ? "True" : "False";
    case "null":
      return "null";
    case "list":
      return `[${value.items.map(valueToText).join(", ")}]`;
    case "tuple":
      return `(${value.items.map(valueToText).join(", ")})`;
    case "dictionary":
      return `{${[...value.entries].map(([key, item]) => `${JSON.stringify(key)}: ${valueToText(item)}`).join(", ")}}`;
    case "function":
      return `<function ${value.declaration.name}>`;
    case "builtin":
      return `<built-in ${value.name}>`;
  }
}

export function valuesEqual(left: SticksValue, right: SticksValue): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  switch (left.kind) {
    case "number":
    case "text":
    case "boolean":
      return left.value === (right as typeof left).value;
    case "null":
      return true;
    case "list": {
      const r = right as Extract<SticksValue, { kind: "list" }>;
      return left.items.length === r.items.length && left.items.every((item, index) => valuesEqual(item, r.items[index]));
    }
    case "tuple": {
      const r = right as Extract<SticksValue, { kind: "tuple" }>;
      return left.items.length === r.items.length && left.items.every((item, index) => valuesEqual(item, r.items[index]));
    }
    case "dictionary": {
      const r = right as Extract<SticksValue, { kind: "dictionary" }>;
      if (left.entries.size !== r.entries.size) return false;
      return [...left.entries].every(([key, value]) => {
        const other = r.entries.get(key);
        return other !== undefined && valuesEqual(value, other);
      });
    }
    case "function":
    case "builtin":
      return left === right;
  }
}
