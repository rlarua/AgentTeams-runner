import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { logger } from "../logger.js";
import { TriggerLogReporter } from "./log-reporter.js";

type Payload = {
  logs?: Array<{ level: string; message: string }>;
  heartbeat?: boolean;
};

test.afterEach(() => {
  mock.restoreAll();
});

test("TriggerLogReporter normalizes log messages and drains them on stop", async () => {
  const payloads: Payload[] = [];
  const client = {
    appendTriggerLogs: async (_triggerId: string, payload: Payload) => {
      payloads.push(payload);
    }
  };

  const reporter = new TriggerLogReporter(client as never, "trigger-1");
  reporter.append("INFO", "\u001B[31m hello \r\n\r\n\r\nworld \u0007");
  reporter.append("WARN", "   ");
  await reporter.stop();

  assert.equal(payloads.length, 1);
  assert.deepEqual(payloads[0], {
    logs: [{ level: "INFO", message: "hello \n\nworld" }],
    heartbeat: true
  });
});

test("TriggerLogReporter prepends a dropped-log warning when the buffer overflows", async () => {
  const payloads: Payload[] = [];
  const client = {
    appendTriggerLogs: async (_triggerId: string, payload: Payload) => {
      payloads.push(payload);
    }
  };

  const reporter = new TriggerLogReporter(client as never, "trigger-1");
  for (let index = 0; index < 501; index += 1) {
    reporter.append("INFO", `line-${index}`);
  }

  await reporter.stop();

  const flattened = payloads.flatMap((payload) => payload.logs ?? []);
  assert.match(flattened[0]?.message ?? "", /Dropped 1 log line/);
  assert.equal(flattened.length, 501);
  assert.equal(flattened.at(-1)?.message, "line-500");
});

test("TriggerLogReporter sends heartbeat flushes on interval and start is idempotent", async () => {
  const payloads: Payload[] = [];
  const intervals: Array<() => void> = [];
  const intervalHandles: object[] = [];
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;

  globalThis.setInterval = (((callback: () => void) => {
    intervals.push(callback);
    const handle = {};
    intervalHandles.push(handle);
    return handle as NodeJS.Timeout;
  }) as typeof setInterval);

  globalThis.clearInterval = (((handle: NodeJS.Timeout) => {
    assert.equal(intervalHandles.includes(handle as unknown as object), true);
  }) as typeof clearInterval);

  try {
    const client = {
      appendTriggerLogs: async (_triggerId: string, payload: Payload) => {
        payloads.push(payload);
      }
    };

    const reporter = new TriggerLogReporter(client as never, "trigger-1", 10);
    reporter.start();
    reporter.start();

    assert.equal(intervals.length, 1);

    await intervals[0]?.();
    await reporter.stop();

    assert.equal(payloads[0]?.heartbeat, true);
    assert.equal(payloads[0]?.logs, undefined);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test("TriggerLogReporter logs warnings when log delivery fails", async () => {
  const warnings: Array<{ message: string; meta?: Record<string, unknown> }> = [];
  mock.method(logger, "warn", (message: string, meta?: Record<string, unknown>) => {
    warnings.push({ message, meta });
  });

  const client = {
    appendTriggerLogs: async () => {
      throw new Error("network down");
    }
  };

  const reporter = new TriggerLogReporter(client as never, "trigger-1");
  reporter.append("ERROR", "failure");
  await reporter.stop();

  assert.equal(warnings.length, 1);
  assert.match(warnings[0]?.message ?? "", /Failed to report trigger logs/);
  assert.equal(warnings[0]?.meta?.payloadSize, 1);
});
