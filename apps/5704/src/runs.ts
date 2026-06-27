import type { Run } from "./types";

// Seeded run history standing in for a real SuperPlane execution log. Timestamps
// are fixed (never Date.now()) so every duration lands on a stable, assertable
// value: run alpha spans exactly 2m 48s, run beta spans exactly 45s, run gamma
// is still running. Credential-shaped fields are redacted in the payloads.
export const SEED_RUNS: Run[] = [
  {
    id: "run_alpha",
    title: "Deploy api-gateway to production",
    status: "failed",
    triggeredBy: "push · main@4f1a9c2",
    startedAt: "2026-06-27T09:14:02Z",
    finishedAt: "2026-06-27T09:16:50Z", // 168_000ms → "2m 48s"
    nodes: [
      {
        id: "n_alpha_1",
        nodeName: "Checkout repository",
        nodeType: "git.checkout",
        status: "succeeded",
        startedAt: "2026-06-27T09:14:02Z",
        finishedAt: "2026-06-27T09:14:02.840Z", // 840ms
        payload: {
          ref: "refs/heads/main",
          commit: "4f1a9c2e7b",
          depth: 1,
          files_changed: 12,
        },
      },
      {
        id: "n_alpha_2",
        nodeName: "Build container image",
        nodeType: "docker.build",
        status: "succeeded",
        startedAt: "2026-06-27T09:14:05Z",
        finishedAt: "2026-06-27T09:15:39Z", // 94_000ms → "1m 34s"
        payload: {
          image: "ghcr.io/acme/api-gateway:4f1a9c2",
          base: "node:20-alpine",
          layers: 14,
          size_mb: 182.4,
          cache_hits: 9,
        },
      },
      {
        id: "n_alpha_3",
        nodeName: "Deploy to Render",
        nodeType: "http.request",
        status: "failed",
        startedAt: "2026-06-27T09:16:44Z",
        finishedAt: "2026-06-27T09:16:50Z", // 6_000ms → "6s"
        payload: {
          request: {
            method: "POST",
            url: "https://api.render.com/v1/services/srv-ck18/deploys",
            headers: { authorization: "Bearer ***redacted***" },
            body: { clearCache: "do_not_clear " },
          },
          response: {
            statusCode: 422,
            body: {
              message: "clearCache must be one of: clear, do_not_clear",
              id: "srv-ck18",
              docs: "https://render.com/docs/deploys",
            },
          },
          error:
            "HTTP 422 Unprocessable Entity — Render rejected the deploy: clearCache must be one of [clear, do_not_clear] (received \"do_not_clear \" with a trailing space).",
        },
      },
    ],
  },
  {
    id: "run_beta",
    title: "Nightly database migration",
    status: "succeeded",
    triggeredBy: "schedule · 0 3 * * *",
    startedAt: "2026-06-27T03:00:00Z",
    finishedAt: "2026-06-27T03:00:45Z", // 45_000ms → "45s"
    nodes: [
      {
        id: "n_beta_1",
        nodeName: "Acquire migration lock",
        nodeType: "postgres.advisory_lock",
        status: "succeeded",
        startedAt: "2026-06-27T03:00:00Z",
        finishedAt: "2026-06-27T03:00:00.120Z", // 120ms
        payload: { lock_key: 90210, acquired: true, waited_ms: 0 },
      },
      {
        id: "n_beta_2",
        nodeName: "Apply migrations",
        nodeType: "container.exec",
        status: "succeeded",
        startedAt: "2026-06-27T03:00:01Z",
        finishedAt: "2026-06-27T03:00:43Z", // 42_000ms → "42s"
        payload: {
          image: "ghcr.io/acme/migrator:2.3.1",
          command: ["npm", "run", "db:migrate"],
          env: { DATABASE_URL: "postgres://***redacted***" },
          applied: ["0041_add_orders", "0042_add_users", "0043_index_orders_user_id"],
          rows_affected: 0,
        },
      },
      {
        id: "n_beta_3",
        nodeName: "Release migration lock",
        nodeType: "postgres.advisory_unlock",
        status: "succeeded",
        startedAt: "2026-06-27T03:00:44Z",
        finishedAt: "2026-06-27T03:00:45Z", // 1_000ms → "1s"
        payload: { lock_key: 90210, released: true },
      },
    ],
  },
  {
    id: "run_gamma",
    title: "Smoke test staging",
    status: "running",
    triggeredBy: "manual · alex",
    startedAt: "2026-06-27T11:02:00Z",
    finishedAt: null,
    nodes: [
      {
        id: "n_gamma_1",
        nodeName: "Provision preview env",
        nodeType: "render.preview",
        status: "succeeded",
        startedAt: "2026-06-27T11:02:00Z",
        finishedAt: "2026-06-27T11:02:18Z", // 18_000ms → "18s"
        payload: {
          service: "staging-smoke",
          url: "https://staging-smoke.onrender.com",
          region: "oregon",
        },
      },
      {
        id: "n_gamma_2",
        nodeName: "Run smoke suite",
        nodeType: "container.exec",
        status: "running",
        startedAt: "2026-06-27T11:02:20Z",
        finishedAt: null, // still running → "—"
        payload: {
          image: "ghcr.io/acme/smoke:latest",
          command: ["npm", "run", "smoke"],
          total: 24,
          completed: 11,
        },
      },
    ],
  },
];
