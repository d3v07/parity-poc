import type { Role, FactoryRun } from "../contracts/schemas";

/** A role-agent: a stable system prompt + a builder that turns accumulated run
 *  state into the user instruction for this stage. */
export interface RolePrompt {
  role: Role;
  system: string;
  instruction: (run: FactoryRun) => string;
}

/** Compact JSON of the prior artifacts, for embedding in a downstream prompt. */
export function priorContext(run: FactoryRun): string {
  const { gates, ...artifacts } = run;
  return JSON.stringify(artifacts, null, 2);
}
