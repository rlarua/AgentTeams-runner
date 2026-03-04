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
}

export type RunResult = {
  exitCode: number;
};
