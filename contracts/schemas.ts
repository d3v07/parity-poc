/**
 * Parity — frozen artifact contracts (the seam between all three layers).
 *
 * Every role-agent consumes one artifact and emits the next. These zod schemas
 * are the single source of truth shared by the Brains (agents/), the SuperPlane
 * canvas (canvas/), and the Delivery layer (delivery/).
 *
 * RULE: treat this file as frozen. If a change is unavoidable, comment the
 * proposed change on Issue #1 and keep coding to the current shape.
 */
import { z } from "zod";

export const ROLES = [
  "ProductManager",
  "EngineeringManager",
  "Architect",
  "FrontendDeveloper",
  "BackendDeveloper",
  "QAEngineer",
  "SecurityEngineer",
  "DevOpsEngineer",
  "Reviewer",
] as const;
export const Role = z.enum(ROLES);
export type Role = z.infer<typeof Role>;

/** INPUT — a rough idea or GitHub issue. */
export const Issue = z.object({
  id: z.string(), // e.g. "5368"
  number: z.number().optional(),
  title: z.string(),
  body: z.string(),
  labels: z.array(z.string()).default([]),
  repo: z.string().default("superplanehq/superplane"),
});
export type Issue = z.infer<typeof Issue>;

/** ProductManager → product requirements. */
export const PRD = z.object({
  problem: z.string(),
  targetUsers: z.string(),
  userStories: z
    .array(z.object({ as: z.string(), want: z.string(), soThat: z.string() }))
    .min(1),
  acceptanceCriteria: z.array(z.string()).min(1),
  outOfScope: z.array(z.string()).default([]),
  successMetrics: z.array(z.string()).default([]),
});
export type PRD = z.infer<typeof PRD>;

/** EngineeringManager → sprint plan. */
export const SprintPlan = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string(),
        role: Role,
        description: z.string(),
        estimateHours: z.number(),
      }),
    )
    .min(1),
  risks: z.array(z.string()).default([]),
  sequencing: z.array(z.string()).default([]),
});
export type SprintPlan = z.infer<typeof SprintPlan>;

/** Architect → technical design. */
export const ArchitectureSpec = z.object({
  stack: z.object({
    frontend: z.string(),
    backend: z.string().optional(),
    build: z.string(),
    deploy: z.string(),
  }),
  components: z.array(z.object({ name: z.string(), responsibility: z.string() })).min(1),
  dataModel: z
    .array(z.object({ entity: z.string(), fields: z.array(z.string()) }))
    .default([]),
  apiContracts: z
    .array(z.object({ method: z.string(), path: z.string(), description: z.string() }))
    .default([]),
  fileTree: z.array(z.string()).min(1),
});
export type ArchitectureSpec = z.infer<typeof ArchitectureSpec>;

/** A single generated file. */
export const GeneratedFile = z.object({ path: z.string(), content: z.string() });
export type GeneratedFile = z.infer<typeof GeneratedFile>;

/** FrontendDeveloper / BackendDeveloper → code. */
export const CodeBundle = z.object({
  role: Role,
  files: z.array(GeneratedFile).min(1),
  commands: z.object({
    install: z.string(),
    build: z.string(),
    dev: z.string(),
    start: z.string(),
  }),
  env: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type CodeBundle = z.infer<typeof CodeBundle>;

/** QAEngineer → test results. */
export const TestReport = z.object({
  command: z.string(),
  tests: z.array(
    z.object({ name: z.string(), status: z.enum(["pass", "fail", "skip"]) }),
  ),
  passed: z.number(),
  failed: z.number(),
  coverage: z.number().optional(),
  gatePassed: z.boolean(),
});
export type TestReport = z.infer<typeof TestReport>;

/** SecurityEngineer → security review. */
export const SecurityReport = z.object({
  findings: z.array(
    z.object({
      severity: z.enum(["critical", "high", "medium", "low", "info"]),
      file: z.string().optional(),
      issue: z.string(),
      recommendation: z.string(),
    }),
  ),
  secretsScan: z.object({ passed: z.boolean(), details: z.string().optional() }),
  gatePassed: z.boolean(),
});
export type SecurityReport = z.infer<typeof SecurityReport>;

/** DevOpsEngineer → deploy manifest (consumed by the Delivery layer). */
export const DeployManifest = z.object({
  service: z.object({
    name: z.string(),
    type: z.enum(["static_site", "web_service"]),
    runtime: z.string(),
  }),
  buildCommand: z.string(),
  startCommand: z.string().optional(),
  publishPath: z.string().optional(),
  envVars: z.array(z.object({ key: z.string(), sync: z.boolean().default(false) })).default([]),
  healthCheckPath: z.string().default("/"),
  previewUrl: z.string().optional(),
});
export type DeployManifest = z.infer<typeof DeployManifest>;

/** Reviewer → final verdict + PR copy. */
export const ReviewReport = z.object({
  perAgentSummaries: z.array(z.object({ role: Role, summary: z.string() })).min(1),
  verdict: z.enum(["approve", "request_changes", "reject"]),
  prTitle: z.string(),
  prBody: z.string(),
});
export type ReviewReport = z.infer<typeof ReviewReport>;

/** Result of a stage gate ("did the previous stage actually work?"). */
export const GateResult = z.object({
  stage: z.string(),
  passed: z.boolean(),
  reason: z.string(),
  evidence: z.string().optional(),
  timestamp: z.string().optional(),
});
export type GateResult = z.infer<typeof GateResult>;

/**
 * The accumulated message chain for one run — mirrors SuperPlane's `$` object.
 * Fields populate as the pipeline advances; gates append as stages complete.
 */
export const FactoryRun = z.object({
  issue: Issue,
  prd: PRD.optional(),
  sprintPlan: SprintPlan.optional(),
  architecture: ArchitectureSpec.optional(),
  frontend: CodeBundle.optional(),
  backend: CodeBundle.optional(),
  testReport: TestReport.optional(),
  securityReport: SecurityReport.optional(),
  deployManifest: DeployManifest.optional(),
  reviewReport: ReviewReport.optional(),
  gates: z.array(GateResult).default([]),
});
export type FactoryRun = z.infer<typeof FactoryRun>;

/** Maps each role to the schema it must emit — used for validation gates. */
export const ROLE_OUTPUT = {
  ProductManager: PRD,
  EngineeringManager: SprintPlan,
  Architect: ArchitectureSpec,
  FrontendDeveloper: CodeBundle,
  BackendDeveloper: CodeBundle,
  QAEngineer: TestReport,
  SecurityEngineer: SecurityReport,
  DevOpsEngineer: DeployManifest,
  Reviewer: ReviewReport,
} as const;
