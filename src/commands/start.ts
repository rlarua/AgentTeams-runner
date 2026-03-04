import { resolveRuntimeConfig } from "../config.js";
import { startPolling } from "../poller.js";
import { DaemonApiClient } from "../api-client.js";
import { createTriggerHandler } from "../handlers/trigger-handler.js";

export const runStartCommand = async (): Promise<void> => {
  const config = await resolveRuntimeConfig();
  const client = new DaemonApiClient(config.apiUrl, config.daemonToken);
  const triggerHandler = createTriggerHandler(config, client);
  await startPolling(config, triggerHandler);
};
