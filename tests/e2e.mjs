// E2E click-through of the main flow (Ch-6 verification):
//   landing -> login -> dashboard (session) -> pick a repo -> generate ->
//   live progress -> terminal run state -> back to dashboard.
// Also asserts the Ch-5 fixes: a deselected repo is flipped to included=false
// (issue #1), the run resolves to a terminal status (issue #2), and the page
// console stays free of errors.
//
// Run:  npm run test:e2e          (dev server must already be on :3000)
// Env:  E2E_EMAIL, E2E_PASSWORD (test account), E2E_BASE_URL (default localhost:3000)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const { stringToBase64URL, createChunks } = require("@supabase/ssr/dist/main/utils");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
// Credentials come from the environment only — never hard-code them here, this
// repo is public. Create a throwaway Supabase user, then:
//   E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set E2E_EMAIL and E2E_PASSWORD (throwaway Supabase test user) before running.");
  process.exit(2);
}

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function signIn() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const session = await res.json();
  if (!session.access_token) throw new Error(`sign-in failed: ${res.status} ${JSON.stringify(session)}`);
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  const key = `sb-${ref}-auth-token`;
  const chunks = createChunks(key, "base64-" + stringToBase64URL(JSON.stringify(session)));
  return {
    key,
    chunks,
    userId: session.user.id,
    access_token: session.access_token,
  };
}

async function adminQuery(pathname, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

const session = await signIn();
for (const chunk of session.chunks) {
  await context.addCookies([
    { name: chunk.name, value: chunk.value, domain: "localhost", path: "/", sameSite: "Lax" },
  ]);
}

const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => pageErrors.push(String(err)));

try {
  // 1. Landing page
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  check("landing headline", (await page.locator("h1").innerText()).includes("your portfolio."));
  check("landing has CTA", await page.getByRole("link", { name: "Get Started" }).isVisible());

  // 2. Get Started -> login page
  await page.getByRole("link", { name: "Get Started" }).click();
  await page.waitForURL("**/login");
  try {
    await page.getByRole("button", { name: /Continue with GitHub/ }).waitFor({ timeout: 15000 });
    check("login page reachable", true);
  } catch (e) {
    check("login page reachable", false, `url=${page.url()}`);
  }

  // 3. Dashboard with an injected session (GitHub OAuth can't be driven headless)
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await page.getByText("Your Repositories").waitFor({ timeout: 15000 });
  await page.getByText("Loading your repositories…").waitFor({ state: "detached", timeout: 30000 });
  const repoRows = page.locator("label:has(input[type=checkbox])");
  const repoCount = await repoRows.count();
  check("dashboard lists repos", repoCount > 0, `${repoCount} repos`);
  check("dashboard header", (await page.locator("h1").innerText()).includes("@"));

  // 4. Select one repo and confirm the button count tracks the selection
  const preferred = ["FurryForWhat/FurryForWhat", "FurryForWhat/DSA", "FurryForWhat/Cinema_GUI"];
  let chosen = null;
  for (const name of preferred) {
    const row = repoRows.filter({ hasText: name });
    if ((await row.count()) > 0) { chosen = name; break; }
  }
  if (!chosen && repoCount > 0) chosen = (await repoRows.nth(0).locator("span").first().innerText()).trim();
  check("repo chosen for generation", Boolean(chosen), String(chosen));

  // Exactly one repo selected: clear whatever was pre-selected from an older
  // run, then pick `chosen`.
  const rowCount = await repoRows.count();
  for (let i = 0; i < rowCount; i++) {
    const r = repoRows.nth(i);
    const name = (await r.locator("span").first().innerText()).trim();
    const box = r.locator("input[type=checkbox]");
    if (name !== chosen && (await box.isChecked())) await box.uncheck();
    if (name === chosen && !(await box.isChecked())) await box.check();
  }
  const row = repoRows.filter({ hasText: chosen }).first();
  const generateBtn = page.getByRole("button", { name: /Generate Portfolio \(1\)/ });
  check("generate button reflects selection", await generateBtn.isVisible());

  // Previously selected repos from an earlier run — must be deselected by fix #1
  const before = await adminQuery(
    `selected_repos?profile_id=eq.${session.userId}&included=eq.true&select=github_repo`,
    session.access_token
  );

  // 5. Generate -> progress page
  await generateBtn.click();
  await page.waitForURL(/\/generate\/[0-9a-f-]+/, { timeout: 20000 });
  const runId = new URL(page.url()).pathname.split("/").pop();
  check("progress page opened", page.url().includes(`/generate/${runId}`), runId);
  await page.getByText(/of \d+ repos? completed|Fetching|Analyzing|Queued/).first().waitFor({ timeout: 20000 });

  // 6. Wait for the run to reach a terminal status (issue #2: never hangs)
  const cookieHeader = session.chunks.map((c) => `${c.name}=${c.value}`).join("; ");
  const deadline = Date.now() + 240000;
  let status = "pending";
  let finishedAt = null;
  let lastSeen = "";
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/api/status/${runId}`, {
      headers: { Cookie: cookieHeader },
    });
    if (res.ok) {
      const run = await res.json();
      status = run.status;
      finishedAt = run.finished_at ?? null;
      if (status !== lastSeen) {
        results.push(`INFO  run status -> ${status}`);
        lastSeen = status;
      }
      if (status === "success" || status === "failed") break;
    }
    await page.waitForTimeout(2000);
  }
  check("run reached terminal status", status === "success" || status === "failed", status);
  check("run wrote finished_at (issue #2)", Boolean(finishedAt), String(finishedAt));

  if (status === "success") {
    await page.getByText("Portfolio ready!").waitFor({ timeout: 20000 });
    check("success panel shown", true);
    await page.getByRole("button", { name: "Back to Dashboard" }).click();
    await page.waitForURL("**/dashboard", { timeout: 20000 });
    check("back to dashboard", true);
  } else {
    try {
      await page.getByText("Generation failed").waitFor({ timeout: 30000 });
      check("failure panel shown", true, "run failed — see run error");
    } catch {
      check("failure panel shown", false, "progress page never showed the failure state");
    }
  }

  // 7. Issue #1 — deselected repos must be flipped to included=false
  const after = await adminQuery(
    `selected_repos?profile_id=eq.${session.userId}&select=github_repo,included`,
    session.access_token
  );
  const stillIncluded = after.filter((r) => r.included).map((r) => r.github_repo);
  const wronglyStillOn = stillIncluded.filter((r) => r !== chosen);
  check(
    "deselected repo no longer included (issue #1)",
    wronglyStillOn.length === 0,
    `still included: ${JSON.stringify(wronglyStillOn)}`
  );
  check(
    "chosen repo included",
    stillIncluded.includes(chosen),
    `included: ${JSON.stringify(stillIncluded)}`
  );
  const beforeNames = new Set(before.map((r) => r.github_repo));
  const flipped = after.filter((r) => beforeNames.has(r.github_repo) && !r.included);
  results.push(`INFO  flipped to included=false by sync: ${JSON.stringify(flipped.map((r) => r.github_repo))}`);

  // 8. Issue #2 — a run whose background task died must be reaped on read.
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const staleStartedAt = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  const { data: staleRun } = await admin
    .from("runs")
    .insert({
      profile_id: session.userId,
      username: process.env.E2E_USERNAME || "e2e-test",
      status: "fetching",
      started_at: staleStartedAt,
    })
    .select()
    .single();
  const reaped = await fetch(`${BASE}/api/status/${staleRun.id}`, {
    headers: { Cookie: cookieHeader },
  }).then((r) => r.json());
  check(
    "stale run reaped to failed (issue #2)",
    reaped.status === "failed" && /without finishing/.test(reaped.error || ""),
    `${reaped.status}: ${String(reaped.error).slice(0, 80)}`
  );
  await admin.from("runs").delete().eq("id", staleRun.id);

  // 9. Public export endpoint must answer for an anonymous visitor (issue #4)
  const exportUser = process.env.E2E_EXPORT_USERNAME;
  if (!exportUser) check("E2E_EXPORT_USERNAME set", false, "point it at a profile with published entries");
  const exportRes = await fetch(`${BASE}/api/export/${encodeURIComponent(exportUser || "none")}`);
  const exportBody = await exportRes.json();
  check(
    "public export returns data (issue #4)",
    Array.isArray(exportBody) && exportBody.length > 0,
    `${exportBody?.length ?? "?"} entries, status ${exportRes.status}`
  );

  // 10. Console hygiene
  check("no page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  const realErrors = consoleErrors.filter(
    (e) => !/favicon|Failed to load resource: the server responded with a status of 404/.test(e)
  );
  check("no console errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
} catch (err) {
  check("test completed without exception", false, String(err && err.message ? err.message : err).slice(0, 300));
} finally {
  await browser.close();
  console.log("\n=== EazyPortfolio e2e ===");
  for (const line of results) console.log(line);
  console.log(`\n${results.filter((l) => l.startsWith("PASS")).length} passed, ${failures} failed`);
  process.exit(failures === 0 ? 0 : 1);
}
