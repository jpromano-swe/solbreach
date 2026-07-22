import { applyNgrokBypassHeader } from "../backend/ngrok";
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

const RL1_MANIFEST_OVERRIDES = {
  title: "Account Substitution",
  summary:
    "A lending market called Breachlend is testing their borrow function implementation, but the code was written by their newest intern and needs to be double checked before deployed to production. Inspect accounts, and document any findings that can cause protocol malfunction to warn Breachlend.",
  objective:
    "Determine whether a counterfeit deposit path can create position credit and support a real treasury withdrawal.",
  successCriteria:
    "Verified evidence must show that a non-canonical deposit path changed position credit and enabled a treasury withdrawal before the report is accepted.",
  objectives: [
    "Inspect the deposit instruction and the trusted account boundary",
    "Identify the missing binding between source, vault, and approved config",
    "Execute the non-canonical deposit and borrow path",
    "Review the sandbox evidence and document the finding",
  ],
  hints: [
    {
      id: "account-binding",
      title: "Hint 1",
      body: "Start by comparing the collateral account you provide with the vault that receives it.",
    },
    {
      id: "non-canonical-credit",
      title: "Hint 2",
      body: "Watch whether position credit changes even when the collateral route is not the canonical one the protocol should enforce.",
    },
  ] satisfies ResearchLabHint[],
};

const RL2_MANIFEST_OVERRIDES = {
  title: "Yield Hijack",
  summary:
    "Investigate a high-APY staking protocol where a small deposit may affect a valuable position created by another staker.",
  objective:
    "Identify an account-isolation failure, demonstrate unauthorized reward capture, and preserve evidence of the resulting state changes.",
  successCriteria:
    "Verified evidence must show that a small stake changed ownership of a pre-existing position and enabled a different wallet to claim its accumulated rewards.",
  objectives: [
    "Inspect how staking positions are derived and identify the identities represented by the account",
    "Compare the position derived for the existing staker and your wallet",
    "Test whether a small stake can change ownership while preserving accumulated value",
    "Claim the pending rewards, verify impact, and document the finding",
  ],
  hints: [
    {
      id: "position-derivation",
      title: "Hint 1",
      body: "Compare the staking-position address derived for each participant and review which identities appear in the PDA seeds.",
    },
    {
      id: "preserved-rewards",
      title: "Hint 2",
      body: "After staking, inspect whether the position owner changes while its previously accumulated rewards remain available.",
    },
  ] satisfies ResearchLabHint[],
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
  titleOptionId: string | null;
  categoryOptionId: string | null;
  severityOptionId: string | null;
  likelihoodOptionId: string | null;
  rootCauseOptionId: string | null;
  proofOfImpactOptionId: string | null;
  recommendedMitigationOptionId: string | null;
  verifiedEvidenceRefs: string[];
  optionalNotes: string;
};

export type ResearchLabReportAllowedValues = {
  titleOptionId: string[];
  categoryOptionId: string[];
  severityOptionId: string[];
  likelihoodOptionId: string[];
  rootCauseOptionId: string[];
  proofOfImpactOptionId: string[];
  recommendedMitigationOptionId: string[];
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
  stage: "setup" | "investigate" | "report";
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
  impactVerified?: boolean;
  reportUnlocked?: boolean;
  findingReviewPassed?: boolean;
  certificateUnlockable?: boolean;
  verifiedEvidenceRefs?: string[];
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
    id: "rl1-account-substitution",
    slug: "account-substitution",
    title: RL1_MANIFEST_OVERRIDES.title,
    difficulty: "Intermediate",
    estimatedTime: "2-4 hours",
    xpReward: 250,
    status: "active",
    summary: RL1_MANIFEST_OVERRIDES.summary,
    objective: RL1_MANIFEST_OVERRIDES.objective,
    allowedFiles: ["programs/account_substitution/src/lib.rs"],
    entryFile: "programs/account_substitution/src/lib.rs",
    testCommand: "anchor test --skip-deploy",
    successCriteria: RL1_MANIFEST_OVERRIDES.successCriteria,
    templateRef: "research-labs/account-substitution@v1",
    objectives: RL1_MANIFEST_OVERRIDES.objectives,
    hints: RL1_MANIFEST_OVERRIDES.hints,
    files: [],
  },
  {
    id: "rl2-yield-hijack",
    slug: "yield-hijack",
    title: RL2_MANIFEST_OVERRIDES.title,
    difficulty: "Intermediate",
    estimatedTime: "2-4 hours",
    xpReward: 250,
    status: "active",
    summary: RL2_MANIFEST_OVERRIDES.summary,
    objective: RL2_MANIFEST_OVERRIDES.objective,
    allowedFiles: ["programs/yield_hijack/src/lib.rs"],
    entryFile: "programs/yield_hijack/src/lib.rs",
    testCommand: "anchor test --skip-deploy",
    successCriteria: RL2_MANIFEST_OVERRIDES.successCriteria,
    templateRef: "research-labs/yield-hijack@v1",
    objectives: RL2_MANIFEST_OVERRIDES.objectives,
    hints: RL2_MANIFEST_OVERRIDES.hints,
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
    impact_verified?: boolean;
    impactVerified?: boolean;
    report_unlocked?: boolean;
    reportUnlocked?: boolean;
    verified_evidence_refs?: string[];
    verifiedEvidenceRefs?: string[];
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
  impact_verified?: boolean;
  impactVerified?: boolean;
  report_unlocked?: boolean;
  reportUnlocked?: boolean;
  verified_evidence_refs?: string[];
  verifiedEvidenceRefs?: string[];
  status?: ResearchLabTestStatus;
  results?: unknown;
  objective_progress?: number;
  session_status?: ResearchLabSessionStatus;
  lab_completed?: boolean;
  report_status?: ResearchLabReportStatus;
  xp_awarded?: number;
  evidence?: Record<string, unknown>;
  failureReason?: string;
  userFacingEvidence?: string[];
};

export type FindingReviewResponse = {
  session_id?: string;
  status?: "locked" | "draft" | "retry" | "passed";
  findingReviewPassed?: boolean;
  finding_review_passed?: boolean;
  findingReviewAttempts?: number;
  finding_review_attempts?: number;
  failedQuestionIds?: string[];
  failed_question_ids?: string[];
  criticalQuestionsPassed?: boolean;
  critical_questions_passed?: boolean;
  score?: number;
  feedback?: string;
  reportUnlocked?: boolean;
  report_unlocked?: boolean;
  certificateUnlockable?: boolean;
  certificate_unlockable?: boolean;
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

export async function submitResearchLabFindingReview({
  accessToken,
  answers,
  sessionId,
}: {
  accessToken: string;
  answers: Record<string, string>;
  sessionId: string;
}) {
  return researchLabsRequest<FindingReviewResponse>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(
      sessionId
    )}/finding-review/submit`,
    {
      accessToken,
      method: "POST",
      body: JSON.stringify({ answers }),
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

export type ResearchLabExplorerAccount = {
  ref: string;
  address: string;
  label: string;
  ownerProgram: string;
  accountType: string;
  lamports: number;
  data: Record<string, unknown>;
};

export type ResearchLabExplorerRewardCandidate = {
  walletAddress: string;
  positionAddress: string;
  positionRef: string;
  positionLabel: string;
  pendingRewards: number;
  rewardMintRef: string;
  rewardSymbol: string;
};

export type ResearchLabExplorerSnapshot = {
  sessionId: string;
  enabled: boolean;
  reason: string | null;
  network: {
    name: string;
    kind: string;
  };
  program: {
    ref: string;
    address: string;
    name: string;
    version: string;
    interfaceSource: string;
    idl: Record<string, unknown>;
  };
  accounts: ResearchLabExplorerAccount[];
  rewardCandidates: ResearchLabExplorerRewardCandidate[];
  rewardAsset: {
    mintRef: string;
    symbol: string;
    decimals: number;
  };
  totalRewardsPaid: number;
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

export type StakePayload = {
  action_type: "STAKE";
  amount: number;
  source_account_ref: "user_stake_account";
  stake_vault_ref: "stake_vault";
  position_account_ref: "stake_position";
};

export type ClaimRewardsPayload = {
  action_type: "CLAIM_REWARDS";
  position_account_ref: "stake_position";
  reward_vault_ref: "reward_vault";
  destination_account_ref: "user_reward_account";
  instruction_name: string;
  target_wallet_address: string;
};

export type LabTransactionPayload =
  | DepositCollateralPayload
  | WithdrawAgainstCreditPayload
  | StakePayload
  | ClaimRewardsPayload;

export type TransactionResult = {
  transactionRef: string;
  transaction_ref: string;
  instructionType: string;
  instruction_type: string;
  executionStatus: "success" | "failure";
  execution_status: "success" | "failure";
  parameters?: Record<string, unknown>;
  parametersJson?: Record<string, unknown>;
  parameters_json?: Record<string, unknown>;
  logs: string[];
  errorCode?: string;
  error_code?: string;
  parsedState?: Record<string, unknown>;
  parsed_state?: Record<string, unknown>;
  accountDeltas?: Array<Record<string, unknown>>;
  account_deltas?: Array<Record<string, unknown>>;
  evidenceRefs?: string[];
  evidence_refs?: string[];
  protocolState?: Record<string, unknown>;
  protocol_state?: Record<string, unknown>;
  submittedAt?: string;
  submitted_at?: string;
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

export async function getResearchLabExplorer(
  accessToken: string,
  sessionId: string
) {
  return researchLabsRequest<ResearchLabExplorerSnapshot>(
    `/api/v1/research-labs/sessions/${encodeURIComponent(sessionId)}/explorer`,
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
    throw new Error(
      "Connect and authenticate your wallet before loading Research Labs."
    );
  }

  const headers = new Headers(fetchOptions.headers);

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  headers.set("authorization", `Bearer ${accessToken}`);
  applyNgrokBypassHeader(headers, SOLBREACH_BACKEND_URL);

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
  const id =
    stringValue(raw.id) || stringValue(raw.slug) || "rl1-account-substitution";
  const slug =
    stringValue(raw.slug) || stringValue(raw.id) || "account-substitution";
  const isRl1Template =
    id === "rl1-account-substitution" || slug === "account-substitution";
  const isRl2Template = id === "rl2-yield-hijack" || slug === "yield-hijack";
  const fallbackLab = isRl2Template
    ? FALLBACK_RESEARCH_LABS[1]
    : FALLBACK_RESEARCH_LABS[0];
  const manifestOverrides = isRl2Template
    ? RL2_MANIFEST_OVERRIDES
    : isRl1Template
      ? RL1_MANIFEST_OVERRIDES
      : null;

  return {
    id,
    slug,
    title:
      manifestOverrides?.title || stringValue(raw.title) || fallbackLab.title,
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
      manifestOverrides?.summary ||
      stringValue(raw.summary) ||
      stringValue(raw.description) ||
      fallbackLab.summary,
    objective:
      manifestOverrides?.objective ||
      stringValue(raw.objective) ||
      stringValue(raw.lab_objective) ||
      fallbackLab.objective,
    allowedFiles:
      normalizeStringArray(raw.allowed_files ?? raw.allowedFiles) ??
      fallbackLab.allowedFiles,
    entryFile:
      stringValue(raw.entry_file) ||
      stringValue(raw.entryFile) ||
      fallbackLab.entryFile,
    testCommand:
      stringValue(raw.test_command) ||
      stringValue(raw.testCommand) ||
      fallbackLab.testCommand,
    successCriteria:
      manifestOverrides?.successCriteria ||
      stringValue(raw.success_criteria) ||
      stringValue(raw.successCriteria) ||
      fallbackLab.successCriteria,
    templateRef:
      stringValue(raw.template_ref) ||
      stringValue(raw.templateRef) ||
      fallbackLab.templateRef,
    objectives: manifestOverrides?.objectives.length
      ? manifestOverrides.objectives
      : objectives.length
        ? objectives
        : fallbackLab.objectives,
    hints: manifestOverrides?.hints.length
      ? manifestOverrides.hints
      : hints.length
        ? hints
        : fallbackLab.hints,
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
    labId:
      stringValue(raw.lab_id) ||
      stringValue(raw.labId) ||
      "rl1-account-substitution",
    status,
    stage: stageFromStatus(status),
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
    impactVerified: booleanOrUndefined(
      raw.impact_verified ?? raw.impactVerified
    ),
    reportUnlocked: booleanOrUndefined(
      raw.report_unlocked ?? raw.reportUnlocked
    ),
    findingReviewPassed: booleanOrUndefined(
      raw.finding_review_passed ?? raw.findingReviewPassed
    ),
    certificateUnlockable: booleanOrUndefined(
      raw.certificate_unlockable ?? raw.certificateUnlockable
    ),
    verifiedEvidenceRefs:
      normalizeStringArray(
        raw.verified_evidence_refs ?? raw.verifiedEvidenceRefs
      ) ?? [],
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
    stage: stageFromStatus(status),
    status,
    testResults: normalizeRunTestResults(result),
    xpAwarded: numberOrUndefined(result.xp_awarded),
    impactVerified:
      booleanOrUndefined(result.impact_verified ?? result.impactVerified) ??
      session.impactVerified,
    reportUnlocked:
      booleanOrUndefined(result.report_unlocked ?? result.reportUnlocked) ??
      session.reportUnlocked,
    verifiedEvidenceRefs:
      normalizeStringArray(
        result.verified_evidence_refs ?? result.verifiedEvidenceRefs
      ) ?? session.verifiedEvidenceRefs,
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
    titleOptionId:
      stringValue(fields.title_option_id) ||
      stringValue(fields.titleOptionId) ||
      null,
    categoryOptionId:
      stringValue(fields.category_option_id) ||
      stringValue(fields.categoryOptionId) ||
      null,
    severityOptionId:
      stringValue(fields.severity_option_id) ||
      stringValue(fields.severityOptionId) ||
      null,
    likelihoodOptionId:
      stringValue(fields.likelihood_option_id) ||
      stringValue(fields.likelihoodOptionId) ||
      null,
    rootCauseOptionId:
      stringValue(fields.root_cause_option_id) ||
      stringValue(fields.rootCauseOptionId) ||
      null,
    proofOfImpactOptionId:
      stringValue(fields.proof_of_impact_option_id) ||
      stringValue(fields.proofOfImpactOptionId) ||
      null,
    recommendedMitigationOptionId:
      stringValue(fields.recommended_mitigation_option_id) ||
      stringValue(fields.recommendedMitigationOptionId) ||
      null,
    verifiedEvidenceRefs: normalizeStringArray(
      fields.verified_evidence_refs ?? fields.verifiedEvidenceRefs
    ),
    optionalNotes:
      stringValue(fields.optional_notes) || stringValue(fields.optionalNotes),
  };
}

function normalizeReportAllowedValues(
  raw: unknown
): ResearchLabReportAllowedValues {
  const fallback = {
    titleOptionId: ["missing_constraints_counterfeit_credit"],
    categoryOptionId: ["account_substitution"],
    severityOptionId: ["high_treasury_loss", "medium", "high"],
    likelihoodOptionId: [
      "low",
      "medium",
      "medium_high_attacker_supplied_accounts",
      "high",
    ],
    rootCauseOptionId: ["missing_account_binding"],
    proofOfImpactOptionId: ["counterfeit_credit_withdraws_treasury"],
    recommendedMitigationOptionId: ["bind_accounts_to_approved_config"],
  };

  if (!raw || typeof raw !== "object") return fallback;
  const values = raw as Record<string, unknown>;

  return {
    titleOptionId:
      nonEmptyStringArray(values.title_option_id ?? values.titleOptionId) ??
      fallback.titleOptionId,
    categoryOptionId:
      nonEmptyStringArray(
        values.category_option_id ?? values.categoryOptionId
      ) ?? fallback.categoryOptionId,
    severityOptionId:
      nonEmptyStringArray(
        values.severity_option_id ?? values.severityOptionId
      ) ?? fallback.severityOptionId,
    likelihoodOptionId:
      nonEmptyStringArray(
        values.likelihood_option_id ?? values.likelihoodOptionId
      ) ?? fallback.likelihoodOptionId,
    rootCauseOptionId:
      nonEmptyStringArray(
        values.root_cause_option_id ?? values.rootCauseOptionId
      ) ?? fallback.rootCauseOptionId,
    proofOfImpactOptionId:
      nonEmptyStringArray(
        values.proof_of_impact_option_id ?? values.proofOfImpactOptionId
      ) ?? fallback.proofOfImpactOptionId,
    recommendedMitigationOptionId:
      nonEmptyStringArray(
        values.recommended_mitigation_option_id ??
          values.recommendedMitigationOptionId
      ) ?? fallback.recommendedMitigationOptionId,
  };
}

function denormalizeReportFields(fields: ResearchLabReportFields) {
  return {
    titleOptionId: fields.titleOptionId,
    severityOptionId: fields.severityOptionId,
    likelihoodOptionId: fields.likelihoodOptionId,
    categoryOptionId: fields.categoryOptionId,
    rootCauseOptionId: fields.rootCauseOptionId,
    proofOfImpactOptionId: fields.proofOfImpactOptionId,
    recommendedMitigationOptionId: fields.recommendedMitigationOptionId,
    verifiedEvidenceRefs: fields.verifiedEvidenceRefs,
    optionalNotes: fields.optionalNotes,
    title_option_id: fields.titleOptionId,
    severity_option_id: fields.severityOptionId,
    likelihood_option_id: fields.likelihoodOptionId,
    category_option_id: fields.categoryOptionId,
    root_cause_option_id: fields.rootCauseOptionId,
    proof_of_impact_option_id: fields.proofOfImpactOptionId,
    recommended_mitigation_option_id: fields.recommendedMitigationOptionId,
    verified_evidence_refs: fields.verifiedEvidenceRefs,
    optional_notes: fields.optionalNotes,
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
  status: ResearchLabSessionStatus
): ResearchLabSession["stage"] {
  if (status === "provisioning") return "setup";
  if (status === "passed") return "report";
  return "investigate";
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(stringValue).filter(Boolean);
}

function nonEmptyStringArray(raw: unknown): string[] | undefined {
  const values = normalizeStringArray(raw);
  return values.length ? values : undefined;
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

function booleanOrUndefined(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
