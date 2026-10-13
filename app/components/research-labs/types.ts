import type { TransactionResult } from "../../lib/research-labs/lab-state";

export type WorkspaceTab = "inspect" | "exploit" | "verify" | "report";
export type ExecuteExploitView = "HYPOTHESIS" | "EVIDENCE_REVIEW";
export type LabPhase =
  | "INSPECT"
  | "EXECUTE_EXPLOIT"
  | "VERIFY_IMPACT"
  | "SUBMIT_FINDING"
  | "COMPLETED";
export type ReviewMode = "full" | "retry";
export type SandboxStatus =
  | "PROVISIONING"
  | "READY"
  | "RUNNING"
  | "RESETTING"
  | "EXPIRED"
  | "ERROR";

export type AuditReportStage =
  | "BUILDER"
  | "PREVIEW"
  | "SECURE_PATTERNS"
  | "CERTIFY_KNOWLEDGE"
  | "SUBMITTED";

export type ReportCodeSnippet = {
  title: string;
  language: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  code: string;
};

export type AuditReportPreview = {
  title: string;
  severity: string;
  likelihood: string;
  category: string;
  description: string;
  rootCause: string;
  rootCauseSnippet: ReportCodeSnippet | null;
  proofOfImpact: string;
  evidence: string;
  recommendedMitigation: string;
  recommendedMitigationSnippet: ReportCodeSnippet | null;
};

export type AccountEvidence = {
  id: string;
  label: string;
  address: string;
  owner: string;
  role: string;
  authority?: string;
  mint?: string;
  state: Array<{ label: string; value: string; after?: string }>;
};

export type EnrichedTransactionResult = TransactionResult & {
  inputs: {
    actionType?: string;
    collateralSourceRef?: string;
    collateralSourceLabel?: string;
    vaultDestinationRef?: string;
    vaultDestinationLabel?: string;
    sourceAccountRef?: string;
    sourceAccountLabel?: string;
    stakeVaultRef?: string;
    stakeVaultLabel?: string;
    positionAccountRef?: string;
    positionAccountLabel?: string;
    rewardVaultRef?: string;
    rewardVaultLabel?: string;
    destinationAccountRef?: string;
    destinationAccountLabel?: string;
    instructionName?: string;
    targetWalletAddress?: string;
    claimScope?: "own" | "exploit";
    programTemplate?: string;
    entrypointName?: string;
    transferSourceRef?: string;
    transferSourceLabel?: string;
    transferDestinationRef?: string;
    transferDestinationLabel?: string;
    authorityStrategy?: string;
    artifactRef?: string;
    taskRef?: string;
    taskLabel?: string;
    delegateProgramRef?: string;
    delegateProgramLabel?: string;
    rewardAmount?: number;
    amount: number;
  };
};
