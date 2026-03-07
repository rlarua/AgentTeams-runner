export interface Runner {
  run(opts: RunnerOptions): Promise<RunResult>;
}

export interface RunnerOptions {
  triggerId: string;
  prompt: string;
  authPath: string | null;
  apiKey: string;
  apiUrl: string;
  timeoutMs: number;
  agentConfigId: string;
  model?: string | null;
  onStdoutChunk?: (chunk: string) => void;
  onStderrChunk?: (chunk: string) => void;
}

export type RunResult = {
  exitCode: number;
  lastOutput?: string;
  outputText?: string;
  errorMessage?: string;
};
