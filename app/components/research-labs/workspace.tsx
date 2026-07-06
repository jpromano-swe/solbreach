"use client";

import { useEffect } from "react";

import type {
  QuestionnaireAnswer,
  QuestionnaireQuestion,
  QuestionnaireResult,
} from "../../lib/research-labs/rl1-questionnaire";
import type {
  LabTransactionPayload,
  ResearchLabFile,
  ResearchLabReport,
  ResearchLabReportFields,
  SandboxAccountSummary,
} from "../../lib/research-labs/lab-state";
import { ExploitTab } from "./execute-exploit-tab";
import { InspectTab } from "./inspect-tab";
import { ReportTab } from "./report-tab";
import type {
  AccountEvidence,
  AuditReportStage,
  EnrichedTransactionResult,
  ExecuteExploitView,
  ReviewMode,
  WorkspaceTab,
} from "./types";
import {
  AnimatedContentSwitch,
  RESEARCH_LAB_TAB_TRANSITION_ORDER,
  WorkspaceTabs,
} from "./workspace-tabs";

export function ResearchLabWorkspace({
  activeFile,
  activeFileContent,
  activeTab,
  accounts,
  auditReportStage,
  availableTabs,
  evidenceAccounts,
  executeExploitView,
  impactVerified,
  inspectHintRevealed,
  findingReviewPassed,
  files,
  isRunning,
  questionnaireAnswers,
  questionnaireResult,
  reportOpened,
  retryQuestionIds,
  reviewIndex,
  reviewMode,
  reviewOptionOrder,
  reviewQuestions,
  reviewStarted,
  report,
  reportFields,
  level1CertificateAssetId,
  level1CertificateExplorerUrl,
  level1CertificateMinted,
  isMintingLevel1Certificate,
  txResults,
  onChangeExecuteExploitView,
  onChangeReportFields,
  onChangeAuditReportStage,
  onProveImpact,
  onExecuteTransaction,
  onQuestionnaireAnswer,
  onQuestionnaireRetry,
  onQuestionnaireSubmit,
  onOpenFindingReport,
  onReviewIndexChange,
  onReviewStart,
  onSaveReport,
  onSubmitReport,
  onContinueToLevel2,
  onMintLevel1Certificate,
  onSelectFile,
  onTabChange,
  isReportSaving,
  isReportSubmitting,
}: {
  activeFile: ResearchLabFile | null;
  activeFileContent: string;
  activeTab: WorkspaceTab;
  accounts: AccountEvidence[];
  auditReportStage: AuditReportStage;
  availableTabs: WorkspaceTab[];
  evidenceAccounts: SandboxAccountSummary[];
  executeExploitView: ExecuteExploitView;
  impactVerified: boolean;
  inspectHintRevealed: boolean;
  findingReviewPassed: boolean;
  files: ResearchLabFile[];
  isRunning: boolean;
  questionnaireAnswers: QuestionnaireAnswer[];
  questionnaireResult: QuestionnaireResult | null;
  reportOpened: boolean;
  retryQuestionIds: string[];
  reviewIndex: number;
  reviewMode: ReviewMode;
  reviewOptionOrder: Record<string, string[]>;
  reviewQuestions: QuestionnaireQuestion[];
  reviewStarted: boolean;
  report: ResearchLabReport | null;
  reportFields: ResearchLabReportFields;
  level1CertificateAssetId?: string | null;
  level1CertificateExplorerUrl?: string | null;
  level1CertificateMinted: boolean;
  isMintingLevel1Certificate: boolean;
  txResults: EnrichedTransactionResult[];
  onChangeExecuteExploitView: (view: ExecuteExploitView) => void;
  onChangeReportFields: (fields: ResearchLabReportFields) => void;
  onChangeAuditReportStage: (stage: AuditReportStage) => void;
  onProveImpact: () => void;
  onExecuteTransaction: (payload: LabTransactionPayload) => Promise<void>;
  onQuestionnaireAnswer: (answer: QuestionnaireAnswer) => void;
  onQuestionnaireRetry: () => void;
  onQuestionnaireSubmit: () => void;
  onOpenFindingReport: () => void;
  onReviewIndexChange: (index: number) => void;
  onReviewStart: () => void;
  onSaveReport: () => Promise<ResearchLabReport | null>;
  onSubmitReport: (options?: {
    acceptedStage?: AuditReportStage;
  }) => Promise<ResearchLabReport | null | undefined>;
  onContinueToLevel2: () => void;
  onMintLevel1Certificate: () => void;
  onSelectFile: (path: string) => void;
  onTabChange: (tab: WorkspaceTab) => void;
  isReportSaving: boolean;
  isReportSubmitting: boolean;
}) {
  useEffect(() => {
    if (activeTab === "verify") {
      onChangeExecuteExploitView("EVIDENCE_REVIEW");
    }
  }, [activeTab, onChangeExecuteExploitView]);

  const workspaceHeightClass =
    activeTab === "inspect" ? "min-h-[720px] 2xl:min-h-[780px]" : "h-fit";
  const workspaceContentClass =
    activeTab === "inspect"
      ? "min-h-0 flex-1 overflow-hidden"
      : "overflow-visible";
  const transitionFitClass =
    activeTab === "inspect" ? "" : "research-lab-transition-fit";

  const activeTabContent =
    activeTab === "inspect" ? (
      <InspectTab
        accounts={accounts}
        activeFile={activeFile}
        activeFileContent={activeFileContent}
        files={files}
        inspectHintRevealed={inspectHintRevealed}
        onSelectFile={onSelectFile}
      />
    ) : activeTab === "exploit" || activeTab === "verify" ? (
      <ExploitTab
        activeView={executeExploitView}
        evidenceAccounts={evidenceAccounts}
        impactVerified={impactVerified}
        isRunning={isRunning}
        txResults={txResults}
        onChangeView={onChangeExecuteExploitView}
        onExecuteTransaction={onExecuteTransaction}
        onOpenEvidenceReview={() =>
          onChangeExecuteExploitView("EVIDENCE_REVIEW")
        }
        onProveImpact={onProveImpact}
      />
    ) : (
      <ReportTab
        fields={reportFields}
        findingReviewPassed={findingReviewPassed}
        impactVerified={impactVerified}
        isSaving={isReportSaving}
        isSubmitting={isReportSubmitting}
        auditReportStage={auditReportStage}
        questionnaireAnswers={questionnaireAnswers}
        questionnaireResult={questionnaireResult}
        reportOpened={reportOpened}
        retryQuestionIds={retryQuestionIds}
        reviewIndex={reviewIndex}
        reviewMode={reviewMode}
        reviewOptionOrder={reviewOptionOrder}
        reviewQuestions={reviewQuestions}
        reviewStarted={reviewStarted}
        report={report}
        level1CertificateAssetId={level1CertificateAssetId}
        level1CertificateExplorerUrl={level1CertificateExplorerUrl}
        level1CertificateMinted={level1CertificateMinted}
        isMintingLevel1Certificate={isMintingLevel1Certificate}
        onChange={onChangeReportFields}
        onChangeAuditReportStage={onChangeAuditReportStage}
        onQuestionnaireAnswer={onQuestionnaireAnswer}
        onQuestionnaireRetry={onQuestionnaireRetry}
        onQuestionnaireSubmit={onQuestionnaireSubmit}
        onOpenFindingReport={onOpenFindingReport}
        onReviewIndexChange={onReviewIndexChange}
        onReviewStart={onReviewStart}
        onSave={onSaveReport}
        onSubmitReport={onSubmitReport}
        onContinueToLevel2={onContinueToLevel2}
        onMintLevel1Certificate={onMintLevel1Certificate}
      />
    );

  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#111212]/85 shadow-2xl shadow-black/30 backdrop-blur-xl ${workspaceHeightClass}`}
    >
      <WorkspaceTabs
        activeTab={activeTab}
        availableTabs={availableTabs}
        onTabChange={onTabChange}
      />
      <div className={workspaceContentClass}>
        <AnimatedContentSwitch
          className={transitionFitClass}
          transitionKey={activeTab}
          transitionOrder={RESEARCH_LAB_TAB_TRANSITION_ORDER}
        >
          {activeTabContent}
        </AnimatedContentSwitch>
      </div>
    </div>
  );
}
