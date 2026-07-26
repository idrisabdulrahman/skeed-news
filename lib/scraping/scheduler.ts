import "server-only";
import { OXYLABS_DATA_BASE, OXYLABS_TIMEOUT_MS } from "@/lib/pipeline/limits";

// Oxylabs Scheduler + Push-Pull client (AGENTS.md §18). Transport only — all
// orchestration lives in lib/pipeline/scheduler-*. Basic auth from server-only
// env; never imported by client code.
//
// ─── Large-integer precision (§18, CRITICAL) ─────────────────────────────────
// Oxylabs `schedule_id` and job `id` are 64-bit integers that exceed
// Number.MAX_SAFE_INTEGER. `JSON.parse` silently corrupts the trailing digits,
// producing an id Oxylabs will not recognise. So every such id is extracted from
// the RAW response text via regex BEFORE any JSON.parse, and kept as a string
// end-to-end. We never JSON.parse an id then stringify it back — precision is
// already lost at parse time.

const AUTH_ERR =
  "Missing OXY_WSA_USERNAME or OXY_WSA_PASSWORD for Oxylabs Scheduler.";

function authHeader(): string {
  const username = process.env.OXY_WSA_USERNAME;
  const password = process.env.OXY_WSA_PASSWORD;
  if (!username || !password) throw new Error(AUTH_ERR);
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

/** One request to the Push-Pull host. Returns the raw response text (for
 *  precision-safe id extraction) plus status. Throws on transport/timeout. */
async function request(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; ok: boolean; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OXYLABS_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${OXYLABS_DATA_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Oxylabs Scheduler request timed out after ${OXYLABS_TIMEOUT_MS}ms (${method} ${path})`,
      );
    }
    throw new Error(
      `Oxylabs Scheduler request failed (${method} ${path}): ${String(err)}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  // Read the body as TEXT, not JSON — precision-safe id extraction needs the raw
  // digit sequence before any parse.
  const text = await res.text().catch(() => "");
  return { status: res.status, ok: res.ok, text };
}

function assertOk(
  r: { ok: boolean; status: number; text: string },
  what: string,
): void {
  if (!r.ok) {
    throw new Error(
      `Oxylabs Scheduler ${what} returned ${r.status}${r.text ? `: ${r.text.slice(0, 300)}` : ""}`,
    );
  }
}

// ─── create schedule ─────────────────────────────────────────────────────────

export interface ScheduleItem {
  source: string;
  url: string;
  render?: string;
}

export interface CreateScheduleInput {
  cron: string;
  items: ScheduleItem[];
  endTime: string;
}

/**
 * Create an Oxylabs schedule (§18). Returns the `schedule_id` as a STRING
 * extracted from the raw response text — never JSON.parse'd (precision).
 */
export async function createSchedule(
  input: CreateScheduleInput,
): Promise<string> {
  const r = await request("POST", "/schedules", {
    cron: input.cron,
    items: input.items,
    end_time: input.endTime,
  });
  assertOk(r, "create schedule");

  const id = extractFirstId(r.text, "schedule_id");
  if (!id) {
    throw new Error(
      `Oxylabs create schedule returned no schedule_id: ${r.text.slice(0, 300)}`,
    );
  }
  return id;
}

// ─── list schedules ──────────────────────────────────────────────────────────

/**
 * List all Oxylabs schedule ids (§18 orphan handling). Parses every digit token
 * inside the `schedules` array from raw text — precision-safe.
 */
export async function listScheduleIds(): Promise<string[]> {
  const r = await request("GET", "/schedules");
  assertOk(r, "list schedules");
  return extractScheduleIds(r.text);
}

// ─── get runs ────────────────────────────────────────────────────────────────

export interface ScheduleJob {
  id: string;
  resultStatus: string;
}
export interface ScheduleRun {
  runId: string;
  jobs: ScheduleJob[];
}

/**
 * Get a schedule's runs with per-job `result_status` (§18: use /runs, not /jobs).
 * Job ids are extracted precision-safe and each is paired with the
 * `result_status` that follows it in the raw text.
 */
export async function getScheduleRuns(
  scheduleId: string,
): Promise<ScheduleRun[]> {
  const r = await request("GET", `/schedules/${scheduleId}/runs`);
  assertOk(r, "get runs");
  return extractRuns(r.text);
}

// ─── update state ────────────────────────────────────────────────────────────

/** Activate/deactivate a schedule (§18 orphan deactivation). */
export async function setScheduleState(
  scheduleId: string,
  active: boolean,
): Promise<void> {
  const r = await request("PUT", `/schedules/${scheduleId}/state`, { active });
  assertOk(r, "set state");
}

// ─── fetch job result HTML ───────────────────────────────────────────────────

interface JobResultResponse {
  results?: { content?: unknown; status_code?: number }[];
}

/**
 * Fetch a completed job's stored result HTML (the source homepage, §18). The
 * job id is used only in the URL path, so parsing the RESULT body as JSON here
 * is safe — no large ids are read from it. Throws on empty content.
 */
export async function fetchJobResultHtml(jobId: string): Promise<string> {
  const r = await request("GET", `/queries/${jobId}/results`);
  assertOk(r, "fetch job result");

  let data: JobResultResponse;
  try {
    data = JSON.parse(r.text) as JobResultResponse;
  } catch (err) {
    throw new Error(
      `Oxylabs job ${jobId} results were not valid JSON: ${String(err)}`,
    );
  }
  const content = data.results?.[0]?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error(`Oxylabs job ${jobId} returned no HTML content`);
  }
  return content;
}

// ─── precision-safe raw-text parsers ─────────────────────────────────────────
// These operate on raw response text so 64-bit ids never pass through a JS
// number. Exported-adjacent helpers kept module-private.

/** First `"<field>": <digits>` value as a string (e.g. schedule_id on create). */
function extractFirstId(text: string, field: string): string | null {
  const m = new RegExp(`"${field}"\\s*:\\s*"?(\\d+)"?`).exec(text);
  return m ? m[1] : null;
}

/**
 * All schedule ids from `GET /schedules` → `{ "schedules": [<int>, ...] }`.
 * Isolate the array body first, then pull every digit run, so unrelated numbers
 * elsewhere in the payload can't leak in.
 */
function extractScheduleIds(text: string): string[] {
  const arr = /"schedules"\s*:\s*\[([^\]]*)\]/.exec(text);
  const body = arr ? arr[1] : "";
  const ids = body.match(/\d+/g);
  return ids ? Array.from(new Set(ids)) : [];
}

/**
 * Parse runs precision-safe. For each job object we capture its `"id"` and the
 * `"result_status"` that follows it in the same object. run_id is captured per
 * run block. Regex over raw text (not JSON.parse) keeps every id exact.
 */
function extractRuns(text: string): ScheduleRun[] {
  const runs: ScheduleRun[] = [];

  // Split on run_id markers so each job's status stays associated with its run.
  const runRe = /"run_id"\s*:\s*"?(\d+)"?/g;
  const markers: { runId: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = runRe.exec(text)) !== null) {
    markers.push({ runId: m[1], index: m.index });
  }

  if (markers.length === 0) {
    // No run_id markers — treat the whole payload as one implicit run so that a
    // flatter response shape still yields its jobs.
    const jobs = extractJobs(text);
    return jobs.length > 0 ? [{ runId: "", jobs }] : [];
  }

  for (let i = 0; i < markers.length; i++) {
    const startIdx = markers[i].index;
    const endIdx = i + 1 < markers.length ? markers[i + 1].index : text.length;
    const block = text.slice(startIdx, endIdx);
    runs.push({ runId: markers[i].runId, jobs: extractJobs(block) });
  }
  return runs;
}

/**
 * Extract `{ id, resultStatus }` pairs from a text block. Each `"id": <digits>`
 * is paired with the nearest following `"result_status": "..."`. Precision-safe:
 * the id stays a string.
 */
function extractJobs(block: string): ScheduleJob[] {
  const jobs: ScheduleJob[] = [];
  const idRe = /"id"\s*:\s*"?(\d+)"?/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(block)) !== null) {
    const id = m[1];
    const after = block.slice(m.index);
    const statusMatch = /"result_status"\s*:\s*"([^"]*)"/.exec(after);
    jobs.push({
      id,
      resultStatus: statusMatch ? statusMatch[1] : "unknown",
    });
  }
  return jobs;
}
