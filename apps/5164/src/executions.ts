import type { NodeExecution } from "./types";

// Seeded fixtures standing in for a real SuperPlane run history. Two failed
// executions cover the two errors operators hit most: a non-2xx from an HTTP
// node and a non-zero exit from a container step.
export const SEED_EXECUTIONS: NodeExecution[] = [
  {
    id: "exec_9f2c41",
    nodeName: "Deploy to Render",
    nodeType: "http.request",
    status: "failed",
    startedAt: "2026-06-27T09:14:02Z",
    durationMs: 1840,
    input: {
      method: "POST",
      url: "https://api.render.com/v1/services/srv-ck18/deploys",
      headers: { authorization: "Bearer ***redacted***" },
      body: { clearCache: "do_not_clear" },
    },
    output: {
      statusCode: 422,
      body: {
        message: "clearCache must be one of: clear, do_not_clear",
        id: "srv-ck18",
      },
    },
    error:
      "HTTP 422 Unprocessable Entity — Render rejected the deploy: `clearCache` must be one of [clear, do_not_clear] (received \"do_not_clear\" with a trailing space).",
  },
  {
    id: "exec_3a7e88",
    nodeName: "Run migrations",
    nodeType: "container.exec",
    status: "failed",
    startedAt: "2026-06-27T09:14:09Z",
    durationMs: 6120,
    input: {
      image: "ghcr.io/acme/migrator:2.3.1",
      command: ["npm", "run", "db:migrate"],
      env: { DATABASE_URL: "postgres://***redacted***" },
    },
    output: {
      exitCode: 1,
      stderr:
        "error: relation \"public.users\" already exists\n    at Migration.up (0042_add_users.sql:3)",
    },
    error:
      "Container exited with code 1 — migration 0042_add_users failed: relation \"public.users\" already exists. A prior partial run left the table; the migration is not idempotent.",
  },
];
