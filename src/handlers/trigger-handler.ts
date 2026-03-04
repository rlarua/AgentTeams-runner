import type { DaemonTrigger, RuntimeConfig } from "../types.js";
import { DaemonApiClient } from "../api-client.js";
import { createRunnerFactory } from "../runners/index.js";
import { logger } from "../logger.js";

export const createTriggerHandler = (
  config: RuntimeConfig,
  client: DaemonApiClient
) => {
  const createRunner = createRunnerFactory(config.runnerCmd);
  const toPromptString = (prompt: DaemonTrigger["prompt"]): string => {
    if (typeof prompt === "string") {
      return prompt;
    }

    return JSON.stringify(prompt);
  };

  return async (trigger: DaemonTrigger): Promise<void> => {
    try {
      logger.info("Trigger execution started", {
        triggerId: trigger.id,
        runnerType: trigger.runnerType
      });

      const runtime = await client.fetchTriggerRuntime(trigger.id);
      logger.info("Trigger runtime fetched", {
        triggerId: trigger.id,
        agentConfigId: runtime.agentConfigId,
        hasAuthPath: Boolean(runtime.authPath)
      });

      const runner = createRunner(trigger.runnerType);
      const runResult = await runner.run({
        triggerId: trigger.id,
        prompt: toPromptString(trigger.prompt),
        authPath: runtime.authPath,
        apiKey: runtime.apiKey,
        apiUrl: config.apiUrl,
        timeoutMs: config.timeoutMs
      });
      logger.info("Trigger runner finished", {
        triggerId: trigger.id,
        exitCode: runResult.exitCode
      });

      const status = runResult.exitCode === 0 ? "DONE" : "FAILED";
      await client.updateTriggerStatus(trigger.id, status);
      logger.info("Trigger completed", {
        triggerId: trigger.id,
        status
      });
    } catch (error) {
      logger.error("Trigger handling failed", {
        triggerId: trigger.id,
        error: error instanceof Error ? error.message : String(error)
      });

      try {
        await client.updateTriggerStatus(trigger.id, "FAILED");
      } catch (statusError) {
        logger.error("Failed to report trigger as FAILED", {
          triggerId: trigger.id,
          error: statusError instanceof Error ? statusError.message : String(statusError)
        });
      }
    }
  };
};
