/**
 * Parity — stage gates. Each gate answers "did the previous stage actually work?"
 * before the pipeline is allowed to advance. This is the core of the hackathon
 * brief: "each stage should validate that the previous one actually worked."
 *
 * Used by the Brains dry-run runner, the Delivery health check, and mirrored as
 * CEL conditions in the SuperPlane canvas.
 */
import { execSync } from "node:child_process";
import type { ZodTypeAny } from "zod";
import { GateResult } from "./schemas";

function now(): string {
  return new Date().toISOString();
}

/** Build a GateResult from a boolean-or-detail check, never throwing. */
export function runGate(
  stage: string,
  check: () => boolean | { passed: boolean; reason?: string; evidence?: string },
): GateResult {
  try {
    const r = check();
    const out =
      typeof r === "boolean"
        ? { passed: r, reason: r ? "ok" : "check returned false" }
        : { passed: r.passed, reason: r.reason ?? (r.passed ? "ok" : "failed"), evidence: r.evidence };
    return GateResult.parse({ stage, ...out, timestamp: now() });
  } catch (err) {
    return GateResult.parse({
      stage,
      passed: false,
      reason: "gate threw",
      evidence: err instanceof Error ? err.message : String(err),
      timestamp: now(),
    });
  }
}

/** Schema gate — the emitted artifact must match its contract. */
export function schemaGate(stage: string, schema: ZodTypeAny, data: unknown): GateResult {
  const parsed = schema.safeParse(data);
  return runGate(stage, () =>
    parsed.success
      ? { passed: true, reason: `${stage} artifact valid` }
      : { passed: false, reason: `${stage} artifact invalid`, evidence: JSON.stringify(parsed.error.issues.slice(0, 5)) },
  );
}

/** Command gate — pass iff the shell command exits 0 (build-green, tests-green). */
export function commandGate(stage: string, command: string, cwd: string): GateResult {
  return runGate(stage, () => {
    try {
      const out = execSync(command, { cwd, stdio: "pipe", encoding: "utf8", timeout: 1000 * 60 * 10 });
      return { passed: true, reason: `\`${command}\` exited 0`, evidence: out.slice(-2000) };
    } catch (err: any) {
      const detail = [err?.stdout, err?.stderr].filter(Boolean).join("\n").slice(-2000);
      return { passed: false, reason: `\`${command}\` failed`, evidence: detail || String(err) };
    }
  });
}

/** Predicate gate — arbitrary boolean with a human reason. */
export function predicateGate(stage: string, passed: boolean, reason: string, evidence?: string): GateResult {
  return runGate(stage, () => ({ passed, reason, evidence }));
}

/** Throw if a gate failed — used by the runner to halt the pipeline. */
export function assertGate(gate: GateResult): GateResult {
  if (!gate.passed) {
    throw new Error(`GATE FAILED [${gate.stage}]: ${gate.reason}${gate.evidence ? `\n${gate.evidence}` : ""}`);
  }
  return gate;
}

/** True only if every gate in the chain passed. */
export function allPassed(gates: GateResult[]): boolean {
  return gates.length > 0 && gates.every((g) => g.passed);
}
