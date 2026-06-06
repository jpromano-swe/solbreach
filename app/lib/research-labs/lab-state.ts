import { SOLBREACH_BACKEND_URL } from "../levels/level1-backend";

export type ResearchLabStatus =
  | "draft"
  | "active"
  | "available"
  | "completed"
  | "archived";

export type ResearchLabFile = {
  path: string;
  language: "rust" | "toml" | "markdown" | "typescript" | "json" | "text";
  content: string;
  writable: boolean;
};

export type ResearchLabHint = {
  id: string;
  title: string;
  body: string;
};

export type ResearchLabManifest = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  estimatedTime: string;
  xpReward: number;
  status: ResearchLabStatus;
  summary: string;
  objective: string;
  allowedFiles: string[];
  entryFile: string;
  testCommand: string;
  successCriteria: string;
  templateRef: string;
  objectives: string[];
  hints: ResearchLabHint[];
  files: ResearchLabFile[];
};

export type ResearchLabSessionStatus =
  | "provisioning"
  | "active"
  | "dirty"
  | "running_tests"
  | "passed"
  | "failed"
  | "expired"
  | "destroyed"
  | "error";

export type ResearchLabTestStatus =
  | "running"
  | "passed"
  | "failed"
  | "timeout"
  | "error";

export type ResearchLabTestResult = {
  id: string;
  label: string;
  passed: boolean;
};

export type ResearchLabTerminalEvent = {
  sequence: number;
  stream: "system" | "stdout" | "stderr";
  line: string;
};

export type ResearchLabReportStatus =
  | "locked"
  | "draft"
  | "saving"
  | "submitting"
  | "retry"
  | "accepted";

export type ResearchLabReportFields = {
  vulnerabilityCategory: string | null;
  affectedArea: string | null;
  rootCause: string;
  impact: string;
  proof: string;
  recommendedFix: string;
  severity: string | null;
};

export type ResearchLabReportAllowedValues = {
  vulnerabilityCategory: string[];
  affectedArea: string[];
  severity: string[];
};

export type ResearchLabReport = {
  sessionId: string;
  status: ResearchLabReportStatus;
  fields: ResearchLabReportFields | null;
  allowedValues: ResearchLabReportAllowedValues;
  feedback: string | null;
  labCompleted?: boolean;
  xpAwarded?: number;
  updatedAt?: string;
};

export type ResearchLabSession = {
  sessionId: string;
  labId: string;
  status: ResearchLabSessionStatus;
  stage: "setup" | "investigate" | "fix" | "report";
  expiresAt: string;
  files: Record<string, string>;
  fileEntries: ResearchLabFile[];
  terminalEvents: ResearchLabTerminalEvent[];
  terminalLines: string[];
  latestTerminalSequence: number;
  testResults: ResearchLabTestResult[];
  objectiveProgress: number;
  reportStatus?: ResearchLabReportStatus;
  xpAwarded?: number;
  labCompleted?: boolean;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  } | null;
};

type RawResearchLab = Record<string, unknown>;
type RawResearchLabSession = Record<string, unknown>;
type RawResearchLabReport = Record<string, unknown>;

export const FALLBACK_RESEARCH_LABS: ResearchLabManifest[] = [
  {
    id: "rl-007",
    slug: "vault-mirage",
    title: "Vault Mirage",
    difficulty: "Intermediate",
    estimatedTime: "2-4 hours",
    xpReward: 250,
    status: "active",
    summary:
      "A lending protocol reports suspicious vault health calculations. Review the deposit path and repair the arithmetic trust boundary.",
    objective:
      "Identify and fix the arithmetic flaw that lets attacker-controlled oracle input distort collateral health.",
    allowedFiles: ["programs/vault_mirage/src/lib.rs"],
    entryFile: "programs/vault_mirage/src/lib.rs",
    testCommand: "anchor test --skip-deploy",
    successCriteria:
      "Collateral value must use checked multiplication and checked division before the health comparison.",
    templateRef: "research-labs/vault-mirage@v1",
    objectives: [
      "Inspect the vault health calculation",
      "Identify the unchecked arithmetic boundary",
      "Patch the vulnerable code fragment",
      "Run the sandboxed lab tests",
    ],
    hints: [
      {
        id: "health-calculation",
        title: "Hint 1",
        body: "Focus on the line that multiplies deposited amount by oracle price before scaling.",
      },
      {
        id: "checked-arithmetic",
        title: "Hint 2",
        body: "The safe pattern should make overflow impossible before the health comparison executes.",
      },
    ],
    files: [],
  },
];

export async function listResearchLabs(accessToken: string) {
  const data = await researchLabsRequest<RawResearchLab[]>(
    "/api/v1/research-labs",
    { accessToken }
  );
  return data.map(normalizeLab);
}

export async function getResearchLab(accessToken: string, labId: string) {
  const data = await researchLabsRequest<RawResearchLab>(
    `/api/v1/research-labs/${encodeURIComponent(labId)}`,
    { accessToken }
  );
  return normalizeLab(data);
}

export async function createResearchLabSession(
  accessToken: string,
  labId: string
) {
  const data = await researchLabsRequest<RawResearchLabSession>(
    `/api/v1/research-labs/${encodeURIComponent(labId)}/sessions`,
    { accessToken, method: "POST" }
  );
  return normalizeSession(data);
}

export async function getResearchLabSession(
  accessToken: string,
  sessionId: string
) {
  const data = await researchLabsRequest<RawResearchLabSession>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}`,
    { accessToken }
  );
  return normalizeSession(data);
}

export async function patchResearchLabFiles({
  accessToken,
  files,
  sessionId,
}: {
  accessToken: string;
  files: Array<{ path: string; content: string }>;
  sessionId: string;
}) {
  const data = await researchLabsRequest<RawResearchLabSession>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/files`,
    {
      accessToken,
      body: JSON.stringify({ files }),
      method: "PATCH",
    }
  );
  return normalizeSession(data);
}

export async function runResearchLabTests(
  accessToken: string,
  sessionId: string
) {
  return researchLabsRequest<{
    test_run_id?: string;
    status?: ResearchLabTestStatus;
    results?: unknown;
    objective_progress?: number;
    session_status?: ResearchLabSessionStatus;
    lab_completed?: boolean;
    report_status?: ResearchLabReportStatus;
    xp_awarded?: number;
  }>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/run-tests`,
    {
      accessToken,
      method: "POST",
    }
  );
}

export type VerifyObjectiveResponse = {
  session_id?: string;
  objective_ref?: string;
  passed?: boolean;
  phase?: string;
  exploitVerified?: boolean;
  reportUnlocked?: boolean;
  userFacingEvidence?: string[];
  status?: ResearchLabTestStatus;
  results?: unknown;
  objective_progress?: number;
  session_status?: ResearchLabSessionStatus;
  lab_completed?: boolean;
  report_status?: ResearchLabReportStatus;
  xp_awarded?: number;
};

export async function verifyResearchLabObjective(
  accessToken: string,
  sessionId: string
) {
  return researchLabsRequest<VerifyObjectiveResponse>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/verify-objective`,
    {
      accessToken,
      method: "POST",
    }
  );
}

export async function submitResearchLabTransaction(
  accessToken: string,
  sessionId: string,
  payload: LabTransactionPayload
) {
  const { action_type, ...parameters } = payload;
  return researchLabsRequest<TransactionResult>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/transactions`,
    {
      accessToken,
      method: "POST",
      body: JSON.stringify({ action_type, parameters }),
    }
  );
}

export type SandboxAccountSummary = {
  ref: string;
  label: string;
  owner: string;
  lamports: number;
  data: Record<string, unknown>;
};

export type SandboxAccountSnapshot = {
  ref: string;
  label: string;
  owner: string;
  lamports: number;
  data: Record<string, unknown>;
};

export type DepositCollateralPayload = {
  action_type: "DEPOSIT_COLLATERAL";
  amount: number;
  collateral_account_ref: string;
  vault_account_ref: string;
};

export type WithdrawAgainstCreditPayload = {
  action_type: "WITHDRAW_AGAINST_CREDIT";
  amount: number;
};

export type LabTransactionPayload =
  | DepositCollateralPayload
  | WithdrawAgainstCreditPayload;

export type TransactionResult = {
  transactionRef: string;
  transaction_ref: string;
  instructionType: string;
  instruction_type: string;
  executionStatus: "success" | "failure";
  execution_status: "success" | "failure";
  logs: string[];
  userFacingEvidence?: string[];
};

export async function getResearchLabAccounts(
  accessToken: string,
  sessionId: string
) {
  return researchLabsRequest<{ accounts: SandboxAccountSummary[] }>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/accounts`,
    { accessToken }
  );
}

export async function getResearchLabAccount(
  accessToken: string,
  sessionId: string,
  accountRef: string
) {
  return researchLabsRequest<{ account: SandboxAccountSnapshot }>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/accounts/${encodeURIComponent(accountRef)}`,
    { accessToken }
  );
}

export async function getResearchLabTransactionLogs(
  accessToken: string,
  sessionId: string,
  transactionRef: string
) {
  return researchLabsRequest<{ logs: string[] }>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/transactions/${encodeURIComponent(transactionRef)}/logs`,
    { accessToken }
  );
}

export async function listResearchLabTransactions(
  accessToken: string,
  sessionId: string
) {
  return researchLabsRequest<{ transactions: TransactionResult[] }>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/transactions`,
    { accessToken }
  );
}

export async function getResearchLabReport(
  accessToken: string,
  sessionId: string
) {
  const data = await researchLabsRequest<RawResearchLabReport>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/report`,
    { accessToken }
  );
  return normalizeReport(data);
}

export async function saveResearchLabReportDraft({
  accessToken,
  fields,
  sessionId,
}: {
  accessToken: string;
  fields: ResearchLabReportFields;
  sessionId: string;
}) {
  const data = await researchLabsRequest<RawResearchLabReport>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/report`,
    {
      accessToken,
      body: JSON.stringify({ fields: denormalizeReportFields(fields) }),
      method: "PUT",
    }
  );
  return normalizeReport(data);
}

export async function submitResearchLabReport(
  accessToken: string,
  sessionId: string
) {
  const data = await researchLabsRequest<RawResearchLabReport>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(
      sessionId
    )}/report/submit`,
    { accessToken, method: "POST" }
  );
  return normalizeReport(data);
}

export async function fetchResearchLabTerminal({
  accessToken,
  afterSequence,
  sessionId,
}: {
  accessToken: string;
  afterSequence: number;
  sessionId: string;
}) {
  const data = await researchLabsRequest<{
    events?: ResearchLabTerminalEvent[];
    latest_sequence?: number;
  }>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(
      sessionId
    )}/terminal?after_sequence=${afterSequence}`,
    { accessToken }
  );

  const events = Array.isArray(data.events)
    ? data.events.map(normalizeTerminalEvent)
    : [];

  return {
    events,
    latestSequence:
      typeof data.latest_sequence === "number"
        ? data.latest_sequence
        : (events.at(-1)?.sequence ?? afterSequence),
  };
}

export async function resetResearchLabSession(
  accessToken: string,
  sessionId: string
) {
  const data = await researchLabsRequest<RawResearchLabSession>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/reset`,
    { accessToken, method: "POST" }
  );
  return normalizeSession(data);
}

async function researchLabsRequest<T>(
  path: string,
  options: RequestInit & { accessToken: string }
): Promise<T> {
  const { accessToken, ...fetchOptions } = options;

  if (!accessToken?.trim()) {
    throw new Error("Connect and authenticate your wallet before loading Research Labs.");
  }

  const headers = new Headers(fetchOptions.headers);

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  headers.set("authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${SOLBREACH_BACKEND_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(errorMessageFromBody(body, response.statusText));
  }

  if (body && typeof body === "object" && "success" in body && "data" in body) {
    const envelope = body as ApiEnvelope<T>;
    if (!envelope.success) {
      throw new Error(
        envelope.error?.message ??
          envelope.error?.code ??
          "Research Labs request failed."
      );
    }
    return envelope.data;
  }

  return body as T;
}

function normalizeLab(raw: RawResearchLab): ResearchLabManifest {
  const objectives = normalizeStringArray(raw.objectives);
  const hints = normalizeHints(raw.hints);

  return {
    id: stringValue(raw.id) || stringValue(raw.slug) || "rl-007",
    slug: stringValue(raw.slug) || stringValue(raw.id) || "vault-mirage",
    title: stringValue(raw.title) || "Vault Mirage",
    difficulty: titleCase(
      stringValue(raw.difficulty) ||
        stringValue(raw.difficulty_level) ||
        "intermediate"
    ),
    estimatedTime:
      stringValue(raw.estimated_time) ||
      stringValue(raw.estimatedTime) ||
      "2-4 hours",
    xpReward: numberValue(raw.xp_reward ?? raw.xpReward, 250),
    status: (stringValue(raw.status) as ResearchLabStatus | "") || "active",
    summary:
      stringValue(raw.summary) ||
      stringValue(raw.description) ||
      FALLBACK_RESEARCH_LABS[0].summary,
    objective:
      stringValue(raw.objective) ||
      stringValue(raw.lab_objective) ||
      FALLBACK_RESEARCH_LABS[0].objective,
    allowedFiles:
      normalizeStringArray(raw.allowed_files ?? raw.allowedFiles) ??
      FALLBACK_RESEARCH_LABS[0].allowedFiles,
    entryFile:
      stringValue(raw.entry_file) ||
      stringValue(raw.entryFile) ||
      FALLBACK_RESEARCH_LABS[0].entryFile,
    testCommand:
      stringValue(raw.test_command) ||
      stringValue(raw.testCommand) ||
      FALLBACK_RESEARCH_LABS[0].testCommand,
    successCriteria:
      stringValue(raw.success_criteria) ||
      stringValue(raw.successCriteria) ||
      FALLBACK_RESEARCH_LABS[0].successCriteria,
    templateRef:
      stringValue(raw.template_ref) ||
      stringValue(raw.templateRef) ||
      FALLBACK_RESEARCH_LABS[0].templateRef,
    objectives: objectives.length
      ? objectives
      : FALLBACK_RESEARCH_LABS[0].objectives,
    hints: hints.length ? hints : FALLBACK_RESEARCH_LABS[0].hints,
    files: normalizeFiles(raw.files),
  };
}

function normalizeSession(raw: RawResearchLabSession): ResearchLabSession {
  const files = normalizeFiles(raw.files);
  const terminalEvents = normalizeTerminalEvents(
    raw.terminal ?? raw.terminal_events ?? raw.terminalEvents
  );
  const latestSequence =
    numberOrUndefined(raw.latest_sequence ?? raw.latestTerminalSequence) ??
    terminalEvents.at(-1)?.sequence ??
    0;
  const status = normalizeSessionStatus(raw.status ?? raw.session_status);
  const objectiveProgress = numberValue(
    raw.objective_progress ?? raw.objectiveProgress,
    status === "passed" ? 4 : 1
  );

  return {
    sessionId:
      stringValue(raw.session_id) ||
      stringValue(raw.sessionId) ||
      stringValue(raw.id),
    labId: stringValue(raw.lab_id) || stringValue(raw.labId) || "rl-007",
    status,
    stage: stageFromStatus(status, objectiveProgress),
    expiresAt:
      stringValue(raw.expires_at) ||
      stringValue(raw.expiresAt) ||
      new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    files: Object.fromEntries(files.map((file) => [file.path, file.content])),
    fileEntries: files,
    terminalEvents,
    terminalLines: terminalEvents.map((event) => event.line),
    latestTerminalSequence: latestSequence,
    testResults: normalizeTestResults(raw.test_results ?? raw.testResults),
    objectiveProgress,
    reportStatus: normalizeOptionalReportStatus(
      raw.report_status ?? raw.reportStatus
    ),
    xpAwarded: numberOrUndefined(raw.xp_awarded ?? raw.xpAwarded),
    labCompleted: Boolean(raw.lab_completed ?? raw.labCompleted),
  };
}

export function applyTerminalEvents(
  session: ResearchLabSession,
  events: ResearchLabTerminalEvent[],
  latestSequence?: number
): ResearchLabSession {
  if (!events.length && latestSequence === undefined) return session;
  const bySequence = new Map(
    [...session.terminalEvents, ...events].map((event) => [
      event.sequence,
      event,
    ])
  );
  const terminalEvents = [...bySequence.values()].sort(
    (a, b) => a.sequence - b.sequence
  );

  return {
    ...session,
    latestTerminalSequence:
      latestSequence ??
      terminalEvents.at(-1)?.sequence ??
      session.latestTerminalSequence,
    terminalEvents,
    terminalLines: terminalEvents.map((event) => event.line),
  };
}

export function applyRunResult(
  session: ResearchLabSession,
  result: Awaited<ReturnType<typeof runResearchLabTests>>
): ResearchLabSession {
  const status = normalizeSessionStatus(result.session_status ?? result.status);
  const objectiveProgress = numberValue(
    result.objective_progress,
    status === "passed" ? 4 : session.objectiveProgress
  );

  return {
    ...session,
    labCompleted: Boolean(result.lab_completed),
    objectiveProgress,
    reportStatus: normalizeOptionalReportStatus(result.report_status),
    stage: stageFromStatus(status, objectiveProgress),
    status,
    testResults: normalizeRunTestResults(result),
    xpAwarded: numberOrUndefined(result.xp_awarded),
  };
}

function normalizeReport(raw: RawResearchLabReport): ResearchLabReport {
  return {
    sessionId: stringValue(raw.session_id) || stringValue(raw.sessionId),
    status: normalizeReportStatus(raw.status),
    fields: normalizeReportFields(raw.fields),
    allowedValues: normalizeReportAllowedValues(raw.allowed_values),
    feedback: stringValue(raw.feedback) || null,
    labCompleted: Boolean(raw.lab_completed ?? raw.labCompleted),
    xpAwarded: numberOrUndefined(raw.xp_awarded ?? raw.xpAwarded),
    updatedAt: stringValue(raw.updated_at) || stringValue(raw.updatedAt),
  };
}

function normalizeReportFields(raw: unknown): ResearchLabReportFields | null {
  if (!raw || typeof raw !== "object") return null;
  const fields = raw as Record<string, unknown>;

  return {
    vulnerabilityCategory:
      stringValue(fields.vulnerability_category) ||
      stringValue(fields.vulnerabilityCategory) ||
      null,
    affectedArea:
      stringValue(fields.affected_area) ||
      stringValue(fields.affectedArea) ||
      null,
    rootCause:
      stringValue(fields.root_cause) || stringValue(fields.rootCause),
    impact: stringValue(fields.impact),
    proof: stringValue(fields.proof),
    recommendedFix:
      stringValue(fields.recommended_fix) ||
      stringValue(fields.recommendedFix),
    severity: stringValue(fields.severity) || null,
  };
}

function normalizeReportAllowedValues(
  raw: unknown
): ResearchLabReportAllowedValues {
  const fallback = {
    vulnerabilityCategory: ["missing_validation", "arithmetic_safety"],
    affectedArea: ["deposit_instruction", "vault_health_calculation"],
    severity: ["low", "medium", "high"],
  };

  if (!raw || typeof raw !== "object") return fallback;
  const values = raw as Record<string, unknown>;

  return {
    vulnerabilityCategory:
      normalizeStringArray(
        values.vulnerability_category ?? values.vulnerabilityCategory
      ) ?? fallback.vulnerabilityCategory,
    affectedArea:
      normalizeStringArray(values.affected_area ?? values.affectedArea) ??
      fallback.affectedArea,
    severity: normalizeStringArray(values.severity) ?? fallback.severity,
  };
}

function denormalizeReportFields(fields: ResearchLabReportFields) {
  return {
    vulnerability_category: fields.vulnerabilityCategory,
    affected_area: fields.affectedArea,
    root_cause: fields.rootCause,
    impact: fields.impact,
    proof: fields.proof,
    recommended_fix: fields.recommendedFix,
    severity: fields.severity,
  };
}

function normalizeFiles(raw: unknown): ResearchLabFile[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((file): file is Record<string, unknown> => Boolean(file))
    .map((file) => ({
      path: stringValue(file.path),
      language:
        (stringValue(file.language) as ResearchLabFile["language"]) ||
        languageFromPath(stringValue(file.path)),
      content: stringValue(file.content),
      writable: Boolean(file.writable),
    }))
    .filter((file) => file.path);
}

function normalizeHints(raw: unknown): ResearchLabHint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((hint, index) => {
    if (typeof hint === "string") {
      return {
        id: `hint-${index + 1}`,
        title: `Hint ${index + 1}`,
        body: hint,
      };
    }
    const item = hint as Record<string, unknown>;
    return {
      id: stringValue(item.id) || `hint-${index + 1}`,
      title: stringValue(item.title) || `Hint ${index + 1}`,
      body: stringValue(item.body) || stringValue(item.text),
    };
  });
}

function normalizeTerminalEvents(raw: unknown): ResearchLabTerminalEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((event): event is Record<string, unknown> => Boolean(event))
    .map(normalizeTerminalEvent)
    .sort((a, b) => a.sequence - b.sequence);
}

function normalizeTerminalEvent(
  raw: Record<string, unknown> | ResearchLabTerminalEvent
): ResearchLabTerminalEvent {
  return {
    sequence: numberValue(raw.sequence, 0),
    stream:
      raw.stream === "stderr" ||
      raw.stream === "stdout" ||
      raw.stream === "system"
        ? raw.stream
        : "system",
    line: stringValue(raw.line),
  };
}

function normalizeTestResults(raw: unknown): ResearchLabTestResult[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((test): test is Record<string, unknown> => Boolean(test))
    .map((test, index) => ({
      id: stringValue(test.id) || `test-${index + 1}`,
      label:
        stringValue(test.label) ||
        stringValue(test.name) ||
        `Sandbox test ${index + 1}`,
      passed: Boolean(test.passed),
    }));
}

function normalizeRunTestResults(result: {
  status?: ResearchLabTestStatus;
  results?: unknown;
}) {
  const resultObject =
    result.results && typeof result.results === "object"
      ? (result.results as Record<string, unknown>)
      : {};
  const structured = normalizeTestResults(resultObject.tests);
  if (structured.length) return structured;

  const exitCode = numberOrUndefined(resultObject.exit_code);
  const status = result.status ?? (exitCode === 0 ? "passed" : "failed");

  return [
    {
      id: "sandbox-run",
      label:
        exitCode === undefined
          ? `Sandbox test run ${status}`
          : `Sandbox process exited with code ${exitCode}`,
      passed: status === "passed" || exitCode === 0,
    },
  ];
}

function normalizeSessionStatus(raw: unknown): ResearchLabSessionStatus {
  const status = stringValue(raw);
  if (
    status === "provisioning" ||
    status === "active" ||
    status === "dirty" ||
    status === "running_tests" ||
    status === "passed" ||
    status === "failed" ||
    status === "expired" ||
    status === "destroyed" ||
    status === "error"
  ) {
    return status;
  }
  return "active";
}

function normalizeReportStatus(raw: unknown): ResearchLabReportStatus {
  return normalizeOptionalReportStatus(raw) ?? "locked";
}

function normalizeOptionalReportStatus(
  raw: unknown
): ResearchLabReportStatus | undefined {
  const status = stringValue(raw);
  if (
    status === "locked" ||
    status === "draft" ||
    status === "saving" ||
    status === "submitting" ||
    status === "retry" ||
    status === "accepted"
  ) {
    return status;
  }
  return undefined;
}

function stageFromStatus(
  status: ResearchLabSessionStatus,
  objectiveProgress: number
): ResearchLabSession["stage"] {
  if (status === "provisioning") return "setup";
  if (status === "passed") return "report";
  if (status === "dirty" || status === "failed" || objectiveProgress >= 3) {
    return "fix";
  }
  return "investigate";
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(stringValue).filter(Boolean);
}

function languageFromPath(path: string): ResearchLabFile["language"] {
  if (path.endsWith(".rs")) return "rust";
  if (path.endsWith(".toml")) return "toml";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".json")) return "json";
  return "text";
}

function errorMessageFromBody(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const value = body as {
      error?: { code?: string; message?: string };
      detail?: unknown;
    };
    return (
      value.error?.message ||
      value.error?.code ||
      (typeof value.detail === "string" ? value.detail : undefined) ||
      fallback
    );
  }
  return typeof body === "string" && body ? body : fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numberOrUndefined(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
