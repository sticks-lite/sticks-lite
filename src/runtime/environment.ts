import type { SticksValue } from "./values";

export class Environment {
  readonly values = new Map<string, SticksValue>();

  constructor(
    readonly parent: Environment | null = null,
    readonly isFunctionScope = false
  ) {}
}
