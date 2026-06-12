export interface RuntimeIO {
  readInput(prompt: string): Promise<string> | string;
  writeOutput(text: string): void;
}

export interface RunResult {
  ok: boolean;
  output: string[];
  error?: string;
}
