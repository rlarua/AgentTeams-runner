import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  getDaemonConfigPath,
  readDaemonConfigFile,
  resolveApiUrlForInit,
  resolveRuntimeConfig,
  writeDaemonConfigFile
} from "./config.js";

const envKeys = [
  "HOME",
  "AGENTTEAMS_DAEMON_TOKEN",
  "AGENTTEAMS_API_URL",
  "POLLING_INTERVAL_MS",
  "TIMEOUT_MS",
  "RUNNER_CMD"
] as const;

const withTempHome = async (run: (homeDir: string) => Promise<void>): Promise<void> => {
  const previousEnv = new Map<string, string | undefined>();
  for (const key of envKeys) {
    previousEnv.set(key, process.env[key]);
    delete process.env[key];
  }

  const homeDir = await mkdtemp(join(tmpdir(), "daemon-config-test-"));
  process.env.HOME = homeDir;

  try {
    await run(homeDir);
  } finally {
    await rm(homeDir, { recursive: true, force: true });
    for (const key of envKeys) {
      const value = previousEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test("readDaemonConfigFile returns null when config file does not exist", async () => {
  await withTempHome(async () => {
    const result = await readDaemonConfigFile();
    assert.equal(result, null);
  });
});

test("writeDaemonConfigFile creates the config directory and file", async () => {
  await withTempHome(async () => {
    const filePath = await writeDaemonConfigFile({
      daemonToken: "file-token",
      apiUrl: "https://file.example"
    });

    assert.equal(filePath, getDaemonConfigPath());

    const content = await readFile(filePath, "utf8");
    assert.deepEqual(JSON.parse(content), {
      daemonToken: "file-token",
      apiUrl: "https://file.example"
    });
  });
});

test("readDaemonConfigFile returns null for invalid or incomplete JSON", async () => {
  await withTempHome(async () => {
    const filePath = getDaemonConfigPath();

    await writeDaemonConfigFile({
      daemonToken: "file-token",
      apiUrl: "https://file.example"
    });

    await readFile(filePath, "utf8");
    await import("node:fs/promises").then(({ writeFile }) => writeFile(filePath, "{invalid", "utf8"));
    assert.equal(await readDaemonConfigFile(), null);

    await import("node:fs/promises").then(({ writeFile }) => writeFile(filePath, JSON.stringify({ daemonToken: "only-token" }), "utf8"));
    assert.equal(await readDaemonConfigFile(), null);
  });
});

test("resolveRuntimeConfig prefers environment variables and applies numeric parsing fallbacks", async () => {
  await withTempHome(async () => {
    await writeDaemonConfigFile({
      daemonToken: "file-token",
      apiUrl: "https://file.example"
    });

    process.env.AGENTTEAMS_DAEMON_TOKEN = "env-token";
    process.env.AGENTTEAMS_API_URL = "https://env.example";
    process.env.POLLING_INTERVAL_MS = "-10";
    process.env.TIMEOUT_MS = "1234.7";
    process.env.RUNNER_CMD = "codex";

    const result = await resolveRuntimeConfig();

    assert.deepEqual(result, {
      daemonToken: "env-token",
      apiUrl: "https://env.example",
      pollingIntervalMs: 30_000,
      timeoutMs: 1234,
      idleTimeoutMs: 600_000,
      runnerCmd: "codex"
    });
  });
});

test("resolveRuntimeConfig throws when daemon token is missing", async () => {
  await withTempHome(async () => {
    await assert.rejects(
      () => resolveRuntimeConfig(),
      /Daemon token is missing/
    );
  });
});

test("resolveApiUrlForInit resolves in argument, env, file, default order", async () => {
  await withTempHome(async () => {
    assert.equal(await resolveApiUrlForInit(" https://arg.example "), "https://arg.example");

    process.env.AGENTTEAMS_API_URL = "https://env.example";
    assert.equal(await resolveApiUrlForInit(), "https://env.example");

    delete process.env.AGENTTEAMS_API_URL;
    await writeDaemonConfigFile({
      daemonToken: "file-token",
      apiUrl: "https://file.example"
    });
    assert.equal(await resolveApiUrlForInit(), "https://file.example");

    await import("node:fs/promises").then(({ rm }) => rm(getDaemonConfigPath(), { force: true }));
    assert.equal(await resolveApiUrlForInit(), "https://api.agentteams.run");
  });
});
