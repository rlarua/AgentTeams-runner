import assert from "node:assert/strict";
import test from "node:test";
import { resolveRunnerHistoryPaths } from "./runner-history.js";

test("resolveRunnerHistoryPaths returns null paths when authPath is missing", () => {
  assert.deepEqual(resolveRunnerHistoryPaths(null, "trigger-1", "parent-1"), {
    currentHistoryPath: null,
    parentHistoryPath: null
  });
});

test("resolveRunnerHistoryPaths returns current and parent history paths", () => {
  assert.deepEqual(resolveRunnerHistoryPaths("/workspace/auth", "trigger-1", "parent-1"), {
    currentHistoryPath: "/workspace/auth/.agentteams/runner/history/trigger-1.md",
    parentHistoryPath: "/workspace/auth/.agentteams/runner/history/parent-1.md"
  });
});

test("resolveRunnerHistoryPaths omits parent path when parent trigger is absent", () => {
  assert.deepEqual(resolveRunnerHistoryPaths("/workspace/auth", "trigger-1", null), {
    currentHistoryPath: "/workspace/auth/.agentteams/runner/history/trigger-1.md",
    parentHistoryPath: null
  });
});
