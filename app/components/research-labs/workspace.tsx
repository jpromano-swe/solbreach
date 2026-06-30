"use client";

import { useEffect } from "react";

import type { QuestionnaireAnswer, QuestionnaireResult } from "../../lib/research-labs/rl1-questionnaire";
import type { LabTransactionPayload, ResearchLabFile, ResearchLabReport, ResearchLabReportFields, SandboxAccountSummary } from "../../lib/research-labs/lab-state";
import { ExploitTab } from "./execute-exploit-tab";
import { InspectTab } from "./inspect-tab";
import { ReportTab } from "./report-tab";
import type { AccountEvidence, AuditReportStage, EnrichedTransactionResult, ExecuteExploitView, ReviewMode, WorkspaceTab } from "./types";
import { AnimatedContentSwitch, RESEARCH_LAB_TAB_TRANSITION_ORDER, WorkspaceTabs } from "./workspace-tabs";

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
  findingReviewPassed,
  files,
  isRunning,
  questionnaireAnswers,
  questionnaireResult,
  reportOpened,
  retryQuestionIds,
  reviewAttempts,
  reviewIndex,
  reviewMode,
  reviewStarted,
  report,
  reportFields,
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
  onSelectFile,
  onSubmitReport,
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
  findingReviewPassed: boolean;
  files: ResearchLabFile[];
  isRunning: boolean;
  questionnaireAnswers: QuestionnaireAnswer[];
  questionnaireResult: QuestionnaireResult | null;
  reportOpened: boolean;
  retryQuestionIds: string[];
  reviewAttempts: number;
  reviewIndex: number;
  reviewMode: ReviewMode;
  reviewStarted: boolean;
  report: ResearchLabReport | null;
  reportFields: ResearchLabReportFields;
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
  onSelectFile: (path: string) => void;
  onSubmitReport: () => void;
  onTabChange: (tab: WorkspaceTab) => void;
  isReportSaving: boolean;
  isReportSubmitting: boolean;
}) {
  useEffect(() => {
    if (activeTab === "verify") {
      onChangeExecuteExploitView("EVIDENCE_REVIEW");
    }
  }, [activeTab, onChangeExecuteExploitView]);

  const activeTabContent =
    activeTab === "inspect" ? (
      <InspectTab
        accounts={accounts}
        activeFile={activeFile}
        activeFileContent={activeFileContent}
        files={files}
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
        onOpenEvidenceReview={() => onChangeExecuteExploitView("EVIDENCE_REVIEW")}
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
        reviewAttempts={reviewAttempts}
        reviewIndex={reviewIndex}
        reviewMode={reviewMode}
        reviewStarted={reviewStarted}
        report={report}
        onChange={onChangeReportFields}
        onChangeAuditReportStage={onChangeAuditReportStage}
        onQuestionnaireAnswer={onQuestionnaireAnswer}
        onQuestionnaireRetry={onQuestionnaireRetry}
        onQuestionnaireSubmit={onQuestionnaireSubmit}
        onOpenFindingReport={onOpenFindingReport}
        onReviewIndexChange={onReviewIndexChange}
        onReviewStart={onReviewStart}
        onSave={onSaveReport}
        onSubmit={onSubmitReport}
      />
    );

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#111212]/85 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <WorkspaceTabs activeTab={activeTab} availableTabs={availableTabs} onTabChange={onTabChange} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatedContentSwitch
          transitionKey={activeTab}
          transitionOrder={RESEARCH_LAB_TAB_TRANSITION_ORDER}
        >
          {activeTabContent}
        </AnimatedContentSwitch>
      </div>
    </div>
  );
}
