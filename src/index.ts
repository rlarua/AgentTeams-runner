#!/usr/bin/env node
import { createRequire } from "node:module";
import { runInitCommand } from "./commands/init.js";
import { runStartCommand } from "./commands/start.js";
import { logger } from "./logger.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version?: string };
const daemonVersion = packageJson.version ?? "0.0.0";

const helpText = `Usage: agentteams-daemon [command] [options]

Commands:
  start                       Start daemon polling (default)
  init --token <token>        Initialize daemon config

Options:
  -h, --help                  Show help
  -v, --version               Show version
`;

const main = async () => {
  const [, , command, ...args] = process.argv;

  if (command === "-h" || command === "--help" || command === "help") {
    process.stdout.write(helpText);
    return;
  }

  if (command === "-v" || command === "--version" || command === "version") {
    process.stdout.write(`${daemonVersion}\n`);
    return;
  }

  if (!command || command === "start") {
    await runStartCommand();
    return;
  }

  if (command === "init") {
    await runInitCommand(args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
};

main().catch((error) => {
  logger.error("Daemon exited with error", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
