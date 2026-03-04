import { OpenCodeRunner } from "./opencode.js";
import { ClaudeCodeRunner } from "./claude-code.js";
import { CodexRunner } from "./codex.js";
import { GeminiRunner } from "./gemini.js";
import type { Runner } from "./types.js";

export const createRunnerFactory = (runnerCmd: string) => {
  return (runnerType: string): Runner => {
    switch (runnerType) {
      case "OPENCODE":
        return new OpenCodeRunner(runnerCmd);
      case "CLAUDE_CODE":
        return new ClaudeCodeRunner();
      case "CODEX":
        return new CodexRunner();
      case "GEMINI":
        return new GeminiRunner();
      // TODO: AIDER
      // TODO: GOOSE
      // TODO: PLANDEX
      // TODO: AMP
      default:
        throw new Error(`Unsupported runner type: ${runnerType}`);
    }
  };
};
