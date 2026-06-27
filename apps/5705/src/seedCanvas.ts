import type { Canvas } from "./types";

/**
 * A small in-memory canvas standing in for a SuperPlane pipeline. It is
 * deliberately seeded with three misconfigurations so every warning kind
 * renders on load, alongside correctly-wired nodes for contrast:
 *
 *   webhook ──▶ has-label? ──▶ Deploy to staging ──▶ Notify #releases
 *
 *   • Run migrations (action)  — NO incoming edge → it will never execute.
 *   • Promote to prod (action) — references upstream "smoke-tests" which does
 *                                not exist on the canvas (dangling edge).
 *   • Deploy to staging        — missing its required `service` config key.
 */
export const SEED_CANVAS: Canvas = {
  name: "release-pipeline",
  nodes: [
    {
      id: "n_webhook",
      label: "GitHub webhook",
      kind: "trigger",
      requiredConfig: ["repo"],
      config: { repo: "acme/superplane" },
    },
    {
      id: "n_filter",
      label: "Has release label?",
      kind: "filter",
      requiredConfig: ["expression"],
      config: { expression: "labels contains 'release'" },
    },
    {
      id: "n_deploy_staging",
      label: "Deploy to staging",
      kind: "action",
      // requires both `service` and `image`; author only set `image`.
      requiredConfig: ["service", "image"],
      config: { image: "ghcr.io/acme/web:latest" },
    },
    {
      id: "n_notify",
      label: "Notify #releases",
      kind: "action",
      requiredConfig: ["channel"],
      config: { channel: "#releases" },
    },
    {
      id: "n_migrate",
      label: "Run migrations",
      kind: "action",
      requiredConfig: ["command"],
      config: { command: "npm run db:migrate" },
    },
    {
      id: "n_promote",
      label: "Promote to prod",
      kind: "action",
      requiredConfig: ["service"],
      config: { service: "web-prod" },
    },
  ],
  edges: [
    { from: "n_webhook", to: "n_filter" },
    { from: "n_filter", to: "n_deploy_staging" },
    { from: "n_deploy_staging", to: "n_notify" },
    // "Promote to prod" expects smoke-tests upstream, but that node was deleted.
    { from: "n_smoke_tests", to: "n_promote" },
  ],
};
