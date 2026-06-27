/**
 * Project — the REAL backend. SuperPlane shows the workflow; this does the work.
 * Runs the 9-agent chain with REAL OpenRouter calls (reusing agents/) and serves
 * a live dashboard of the genuine artifacts. Deployed as ONE Render web service.
 *
 *   PORT, OPENROUTER_API_KEY from env.   start: npx tsx backend/server.ts
 */
import "../agents/env";
import { createServer, type IncomingMessage } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { callRole, extractJson } from "../agents/client";
import { PROMPTS } from "../agents/prompts";
import { ROLES, ROLE_OUTPUT, Issue, type FactoryRun, type Role } from "../contracts/schemas";
import { schemaGate } from "../contracts/gates";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT ?? 8080);

const FIELD: Record<Role, keyof FactoryRun> = {
  ProductManager: "prd", EngineeringManager: "sprintPlan", Architect: "architecture",
  FrontendDeveloper: "frontend", BackendDeveloper: "backend", QAEngineer: "testReport",
  SecurityEngineer: "securityReport", DevOpsEngineer: "deployManifest", Reviewer: "reviewReport",
};

type Stage = { role: Role; status: "pending" | "running" | "passed" | "failed"; artifact?: unknown; reason?: string; ms?: number };
type Run = { issueId: string; title: string; stages: Stage[]; startedAt: number; done: boolean; model: string };
let current: Run | null = null;
let running = false;

function loadIssue(id: string) {
  return Issue.parse(JSON.parse(readFileSync(join(ROOT, "fixtures", `issue-${id}.json`), "utf8")));
}

async function runOne(role: Role, run: FactoryRun) {
  const text = await callRole(PROMPTS[role].system, PROMPTS[role].instruction(run));
  const data = extractJson(text);
  return { data, gate: schemaGate(role, ROLE_OUTPUT[role], data) };
}

async function runChain(id: string) {
  running = true;
  const issue = loadIssue(id);
  const run: FactoryRun = { issue, gates: [] } as FactoryRun;
  current = {
    issueId: id, title: issue.title, startedAt: Date.now(), done: false,
    model: process.env.PARITY_MODEL ?? "openai/gpt-oss-120b:free",
    stages: ROLES.map((r) => ({ role: r, status: "pending" })),
  };
  for (const role of ROLES) {
    const st = current.stages.find((s) => s.role === role)!;
    st.status = "running";
    const t0 = Date.now();
    try {
      const { data, gate } = await runOne(role, run);
      st.ms = Date.now() - t0;
      st.artifact = data;
      if (gate.passed) { (run as Record<string, unknown>)[FIELD[role]] = ROLE_OUTPUT[role].parse(data); st.status = "passed"; }
      else { st.status = "failed"; st.reason = gate.reason; }
    } catch (e) {
      st.ms = Date.now() - t0; st.status = "failed"; st.reason = e instanceof Error ? e.message : String(e);
    }
  }
  current.done = true;
  running = false;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((res) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => res(d)); });
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const send = (code: number, body: string, type = "application/json") => {
    res.writeHead(code, { "content-type": type, "access-control-allow-origin": "*" });
    res.end(body);
  };
  try {
    if (req.method === "GET" && url.pathname === "/") return send(200, PAGE, "text/html");
    if (req.method === "GET" && url.pathname === "/state") return send(200, JSON.stringify(current ?? { stages: [] }));
    if (req.method === "GET" && url.pathname === "/health") return send(200, JSON.stringify({ ok: true }));
    if (req.method === "POST" && url.pathname === "/run") {
      const id = (JSON.parse((await readBody(req)) || "{}").issueId as string) ?? "5366";
      if (running) return send(409, JSON.stringify({ error: "a run is in progress" }));
      void runChain(id);
      return send(202, JSON.stringify({ started: id }));
    }
    if (req.method === "POST" && url.pathname.startsWith("/agent/")) {
      const role = url.pathname.split("/")[2] as Role;
      if (!ROLES.includes(role)) return send(400, JSON.stringify({ error: "unknown role" }));
      const parsed = JSON.parse((await readBody(req)) || "{}");
      const run: FactoryRun = parsed.run ?? ({ issue: loadIssue(parsed.issueId ?? "5366"), gates: [] } as FactoryRun);
      const { data, gate } = await runOne(role, run);
      return send(200, JSON.stringify({ role, gate, artifact: data }));
    }
    send(404, JSON.stringify({ error: "not found" }));
  } catch (e) {
    send(500, JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  }
}).listen(PORT, () => process.stdout.write(`Project backend on :${PORT}\n`));

const PAGE = `<!doctype html><html><head><meta charset="utf8"><title>Project — live</title>
<style>
:root{--bg:#0a0e14;--card:#121821;--line:#1e2733;--ink:#e6edf3;--mut:#7d8da3;--ok:#3fb950;--run:#58a6ff;--bad:#f85149;--acc:#a371f7}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 'JetBrains Mono',ui-monospace,monospace}
header{padding:22px 28px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:16px;flex-wrap:wrap}
h1{font:600 19px 'Sora',system-ui;margin:0;letter-spacing:.2px}
.sub{color:var(--mut);font-size:12px}
button{background:var(--acc);color:#0a0e14;border:0;border-radius:8px;padding:9px 16px;font:600 13px 'Sora',system-ui;cursor:pointer}
button:disabled{opacity:.5;cursor:default}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;padding:24px 28px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.card.running{border-color:var(--run);box-shadow:0 0 0 1px var(--run)}
.card.passed{border-color:var(--ok)}.card.failed{border-color:var(--bad)}
.role{font:600 13px 'Sora',system-ui;display:flex;justify-content:space-between;align-items:center}
.dot{width:9px;height:9px;border-radius:50%;background:var(--mut)}
.running .dot{background:var(--run);animation:p 1s infinite}.passed .dot{background:var(--ok)}.failed .dot{background:var(--bad)}
@keyframes p{50%{opacity:.3}}
.ms{color:var(--mut);font-size:11px}
pre{margin:10px 0 0;max-height:170px;overflow:auto;background:#0a0e14;border:1px solid var(--line);border-radius:8px;padding:10px;font-size:11px;color:#9fb1c7;white-space:pre-wrap}
.empty{color:var(--mut);padding:40px 28px}
</style></head><body>
<header><h1>Project</h1><span class="sub">autonomous engineering org · agents run for real on OpenRouter · <span id="model"></span></span>
<span style="flex:1"></span><button id="run" onclick="go()">Run issue 5366</button></header>
<div id="root" class="empty">No run yet — hit <b>Run</b> to watch the 9 agents work live.</div>
<script>
async function go(){document.getElementById('run').disabled=true;await fetch('/run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({issueId:'5366'})});}
function esc(s){return s.replace(/[&<]/g,c=>({'&':'&amp;','<':'&lt;'}[c]))}
async function tick(){
 const s=await (await fetch('/state')).json();
 if(!s.stages||!s.stages.length){return}
 document.getElementById('model').textContent=s.model||'';
 document.getElementById('run').disabled=!s.done;
 const root=document.getElementById('root');root.className='grid';
 root.innerHTML=s.stages.map(st=>{
  const a=st.artifact?esc(JSON.stringify(st.artifact,null,1)).slice(0,1400):(st.reason?('⚠ '+esc(st.reason)):'…');
  return '<div class="card '+st.status+'"><div class="role">'+st.role+'<span class="dot"></span></div>'+
   '<div class="ms">'+st.status+(st.ms?(' · '+st.ms+'ms'):'')+'</div><pre>'+a+'</pre></div>';
 }).join('');
}
setInterval(tick,1200);tick();
</script></body></html>`;
