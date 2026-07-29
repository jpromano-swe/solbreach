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
  ResearchLabManifest,
  ResearchLabReport,
  ResearchLabReportFields,
  SandboxAccountSummary,
} from "../../lib/research-labs/lab-state";
import { ArbitraryCpiExecuteTab } from "./arbitrary-cpi-execute-tab";
import { ExploitTab } from "./execute-exploit-tab";
import { InspectTab } from "./inspect-tab";
import {
  getResearchLabAdapter,
  isArbitraryCpiLab,
  isYieldHijackLab,
} from "./lab-adapters";
import { ReportTab } from "./report-tab";
import { YieldHijackExecuteTab } from "./yield-hijack-execute-tab";
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
  explorerAccessToken,
  explorerSessionId,
  userWalletAddress,
  executeExploitView,
  impactVerified,
  inspectHintRevealed,
  lab,
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
  isMintingResearchLabCertificate,
  level1BadgeCollected,
  researchLabCertificateMinted,
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
  onMintResearchLabCertificate,
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
  explorerAccessToken: string | null;
  explorerSessionId: string;
  userWalletAddress: string;
  executeExploitView: ExecuteExploitView;
  impactVerified: boolean;
  inspectHintRevealed: boolean;
  lab: ResearchLabManifest;
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
  isMintingResearchLabCertificate: boolean;
  level1BadgeCollected: boolean;
  researchLabCertificateMinted: boolean;
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
  onMintResearchLabCertificate: () => Promise<void>;
  onSelectFile: (path: string) => void;
  onTabChange: (tab: WorkspaceTab) => void;
  isReportSaving: boolean;
  isReportSubmitting: boolean;
}) {
  const adapter = getResearchLabAdapter(lab);

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
        evidenceAccounts={evidenceAccounts}
        files={files}
        inspectHintRevealed={inspectHintRevealed}
        lab={lab}
        onSelectFile={onSelectFile}
      />
    ) : activeTab === "exploit" || activeTab === "verify" ? (
      isArbitraryCpiLab(lab) ? (
        <ArbitraryCpiExecuteTab
          activeView={executeExploitView}
          evidenceAccounts={evidenceAccounts}
          explorerAccessToken={explorerAccessToken}
          explorerSessionId={explorerSessionId}
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
      ) : isYieldHijackLab(lab) ? (
        <YieldHijackExecuteTab
          activeView={executeExploitView}
          evidenceAccounts={evidenceAccounts}
          explorerAccessToken={explorerAccessToken}
          explorerSessionId={explorerSessionId}
          userWalletAddress={userWalletAddress}
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
      )
    ) : (
      <ReportTab
        lab={lab}
        questionnaire={adapter.questionnaire}
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
        isMintingResearchLabCertificate={isMintingResearchLabCertificate}
        level1BadgeCollected={level1BadgeCollected}
        researchLabCertificateMinted={researchLabCertificateMinted}
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
        onMintResearchLabCertificate={onMintResearchLabCertificate}
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
