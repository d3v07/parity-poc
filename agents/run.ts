/**
 * Parity Brains — local dry-run orchestrator.
 *
 * Runs the full engineering-org chain for one issue:
 *   PM → EM → Architect → {Frontend ∥ Backend} → QA → Security → DevOps → Reviewer
 * validating every stage with a gate before advancing, materializing the
 * generated app, and proving it really builds + tests green.
 *
 *   npx tsx agents/run.ts --issue 5368 --mock   # offline, replays fixtures/golden
 *   npx tsx agents/run.ts --issue 5368           # live, calls Claude via client.ts
 */
import "./env";
import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Issue,
  ROLE_OUTPUT,
  type FactoryRun,
  type Role,
  type CodeBundle,
  type GateResult,
} from "../contracts/schemas";
import { schemaGate, assertGate, commandGate, predicateGate, allPassed } from "../contracts/gates";
import { PROMPTS } from "./prompts";
import { callRole, extractJson } from "./client";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PIPELINE: Role[] = [
  "ProductManager",
  "EngineeringManager",
  "Architect",
  "FrontendDeveloper",
  "BackendDeveloper",
  "QAEngineer",
  "SecurityEngineer",
  "DevOpsEngineer",
  "Reviewer",
];

const GOLDEN_FILE: Record<Role, string> = {
  ProductManager: "prd.json",
  EngineeringManager: "sprintPlan.json",
  Architect: "architecture.json",
  FrontendDeveloper: "frontend.json",
  BackendDeveloper: "backend.json",
  QAEngineer: "testReport.json",
  SecurityEngineer: "securityReport.json",
  DevOpsEngineer: "deployManifest.json",
  Reviewer: "reviewReport.json",
};

function log(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

/** Write a role's validated artifact into its FactoryRun field. The exhaustive
 *  switch keeps each assignment fully typed (no `as` casts) and makes adding a
 *  tenth role a compile error rather than a silent miss. */
function assignArtifact(run: FactoryRun, role: Role, artifact: unknown): void {
  switch (role) {
    case "ProductManager":
      run.prd = ROLE_OUTPUT.ProductManager.parse(artifact);
      return;
    case "EngineeringManager":
      run.sprintPlan = ROLE_OUTPUT.EngineeringManager.parse(artifact);
      return;
    case "Architect":
      run.architecture = ROLE_OUTPUT.Architect.parse(artifact);
      return;
    case "FrontendDeveloper":
      run.frontend = ROLE_OUTPUT.FrontendDeveloper.parse(artifact);
      return;
    case "BackendDeveloper":
      run.backend = ROLE_OUTPUT.BackendDeveloper.parse(artifact);
      return;
    case "QAEngineer":
      run.testReport = ROLE_OUTPUT.QAEngineer.parse(artifact);
      return;
    case "SecurityEngineer":
      run.securityReport = ROLE_OUTPUT.SecurityEngineer.parse(artifact);
      return;
    case "DevOpsEngineer":
      run.deployManifest = ROLE_OUTPUT.DevOpsEngineer.parse(artifact);
      return;
    case "Reviewer":
      run.reviewReport = ROLE_OUTPUT.Reviewer.parse(artifact);
      return;
    default: {
      const exhaustive: never = role;
      throw new Error(`unhandled role: ${String(exhaustive)}`);
    }
  }
}

/** Produce one role's artifact (mock: replay golden; live: call Claude), then
 *  gate it against its schema and halt the pipeline on failure. */
async function produce(role: Role, run: FactoryRun, opts: { mock: boolean; goldenDir: string }): Promise<unknown> {
  const schema = ROLE_OUTPUT[role];

  if (opts.mock) {
    const data = JSON.parse(readFileSync(join(opts.goldenDir, GOLDEN_FILE[role]), "utf8"));
    const gate = schemaGate(role, schema, data);
    run.gates.push(gate);
    assertGate(gate);
    return schema.parse(data);
  }

  // Live mode: call Claude, validate against the contract, and self-repair once
  // by re-prompting with the exact validation errors before halting the run.
  const prompt = PROMPTS[role];
  const base = prompt.instruction(run);
  let instruction = base;
  let data: unknown;
  let gate: GateResult = predicateGate(role, false, "no response yet");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      data = extractJson(await callRole(prompt.system, instruction));
    } catch (err) {
      gate = predicateGate(role, false, "no parseable JSON in response", err instanceof Error ? err.message : String(err));
      instruction = `${base}\n\nYour previous reply could not be parsed as JSON. Return ONLY one valid JSON object — no prose, no code fences.`;
      continue;
    }
    gate = schemaGate(role, schema, data);
    if (gate.passed) break;
    instruction = `${base}\n\nYour previous JSON failed validation:\n${gate.evidence}\nReturn corrected JSON only, matching the schema exactly.`;
  }
  run.gates.push(gate);
  assertGate(gate);
  return schema.parse(data);
}

function materialize(files: CodeBundle["files"], dir: string, skipExisting = false): void {
  for (const f of files) {
    const p = join(dir, f.path);
    if (skipExisting && existsSync(p)) continue;
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, f.content);
  }
}

function gateTable(gates: GateResult[]): string {
  const rows = gates.map((g) => `  ${g.passed ? "✓" : "✗"}  ${g.stage.padEnd(20)} ${g.reason}`);
  return rows.join("\n");
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      issue: { type: "string" },
      mock: { type: "boolean", default: false },
    },
  });
  const issueId = values.issue;
  const mock = Boolean(values.mock) || process.env.MOCK === "1";
  if (!issueId) throw new Error("usage: run.ts --issue <id> [--mock]");

  const issuePath = join(ROOT, "fixtures", `issue-${issueId}.json`);
  const goldenDir = join(ROOT, "fixtures", "golden", issueId);
  const outDir = join(ROOT, "out", issueId);
  const appDir = join(outDir, "app");

  const issue = Issue.parse(JSON.parse(readFileSync(issuePath, "utf8")));
  log(`\n▶ Parity factory — issue #${issue.id}: ${issue.title}`);
  log(`  mode: ${mock ? "MOCK (golden fixtures)" : "LIVE (OpenRouter)"}  ·  model: ${process.env.PARITY_MODEL ?? "openai/gpt-oss-120b:free"}\n`);

  const run: FactoryRun = { issue, gates: [] };

  // Spec stages — sequential, each gated.
  for (const role of ["ProductManager", "EngineeringManager", "Architect"] as Role[]) {
    log(`  → ${role} ...`);
    assignArtifact(run, role, await produce(role, run, { mock, goldenDir }));
  }

  // Build stage — Frontend ∥ Backend in parallel (as a real team would).
  log(`  → FrontendDeveloper ∥ BackendDeveloper ...`);
  const [fe, be] = await Promise.all([
    produce("FrontendDeveloper", run, { mock, goldenDir }),
    produce("BackendDeveloper", run, { mock, goldenDir }),
  ]);
  assignArtifact(run, "FrontendDeveloper", fe);
  assignArtifact(run, "BackendDeveloper", be);
  if (!run.frontend || !run.backend) throw new Error("frontend/backend bundle missing after build stage");
  const frontend = run.frontend;
  const backend = run.backend;

  // Materialize the generated app and PROVE it builds + tests green (real gates).
  rmSync(appDir, { recursive: true, force: true, maxRetries: 50, retryDelay: 300 });
  mkdirSync(appDir, { recursive: true });
  materialize(frontend.files, appDir);
  materialize(backend.files, appDir, true);
  log(`  → materialized ${frontend.files.length + backend.files.length} files → out/${issue.id}/app`);

  log(`  → gate: build ...`);
  const buildGate = commandGate("build", `${frontend.commands.install} && ${frontend.commands.build}`, appDir);
  run.gates.push(buildGate);
  assertGate(buildGate);

  log(`  → gate: tests ...`);
  const testsGate = commandGate("tests", "npm test", appDir);
  run.gates.push(testsGate);
  assertGate(testsGate);

  // Verify + review stages.
  for (const role of ["QAEngineer", "SecurityEngineer", "DevOpsEngineer", "Reviewer"] as Role[]) {
    log(`  → ${role} ...`);
    assignArtifact(run, role, await produce(role, run, { mock, goldenDir }));
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "run.json"), JSON.stringify(run, null, 2));

  log(`\n  Gates:\n${gateTable(run.gates)}`);
  const ok = allPassed(run.gates);
  log(`\n  Reviewer verdict: ${run.reviewReport?.verdict}`);
  log(`  PR title: ${run.reviewReport?.prTitle}`);
  log(`\n${ok ? "✅ PASSED" : "❌ FAILED"} — ${run.gates.length} gates · artifacts + app written to out/${issue.id}/\n`);
  if (!ok) process.exitCode = 1;
}

main().catch((err) => {
  log(`\n❌ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
