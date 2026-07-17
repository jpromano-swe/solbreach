"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { Level1AuthSession } from "../../lib/levels/level1-backend";
import {
  getResearchLabReport,
  saveResearchLabReportDraft,
  submitResearchLabReport,
  type ResearchLabManifest,
  type ResearchLabReport,
  type ResearchLabReportFields,
  type ResearchLabSession,
} from "../../lib/research-labs/lab-state";
import {
  emptyReportFields,
  getResearchLabReportConfig,
} from "./report-utils";
import type { AuditReportStage } from "./types";

type UseResearchLabReportOptions = {
  activeLab: ResearchLabManifest | null;
  getAuth: () => Promise<Level1AuthSession>;
  onSessionChange: (session: ResearchLabSession) => void;
  session: ResearchLabSession | null;
};

export function useResearchLabReport({
  activeLab,
  getAuth,
  onSessionChange,
  session,
}: UseResearchLabReportOptions) {
  const reportConfig = getResearchLabReportConfig(activeLab);
  const [report, setReport] = useState<ResearchLabReport | null>(null);
  const [reportFields, setReportFields] =
    useState<ResearchLabReportFields>(emptyReportFields);
  const [auditReportStage, setAuditReportStage] =
    useState<AuditReportStage>("BUILDER");
  const [isReportSaving, setIsReportSaving] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  const resolveReportFields = useCallback(
    (fields?: Partial<ResearchLabReportFields> | null) => ({
      ...emptyReportFields,
      ...fields,
      titleOptionId:
        fields?.titleOptionId ??
        reportConfig.suggestedDefaults.titleOptionId ??
        null,
      categoryOptionId:
        fields?.categoryOptionId ??
        reportConfig.suggestedDefaults.categoryOptionId ??
        null,
      severityOptionId:
        fields?.severityOptionId ??
        reportConfig.suggestedDefaults.severityOptionId ??
        null,
      likelihoodOptionId:
        fields?.likelihoodOptionId ??
        reportConfig.suggestedDefaults.likelihoodOptionId ??
        null,
      rootCauseOptionId:
        fields?.rootCauseOptionId ??
        reportConfig.suggestedDefaults.rootCauseOptionId ??
        null,
      proofOfImpactOptionId:
        fields?.proofOfImpactOptionId ??
        reportConfig.suggestedDefaults.proofOfImpactOptionId ??
        null,
      recommendedMitigationOptionId:
        fields?.recommendedMitigationOptionId ??
        reportConfig.suggestedDefaults.recommendedMitigationOptionId ??
        null,
      verifiedEvidenceRefs:
        fields?.verifiedEvidenceRefs?.length
          ? fields.verifiedEvidenceRefs
          : session?.verifiedEvidenceRefs ?? [],
      optionalNotes: fields?.optionalNotes ?? "",
    }),
    [reportConfig, session?.verifiedEvidenceRefs]
  );

  const populateReportDefaults = useCallback(() => {
    setReportFields((fields) => resolveReportFields(fields));
  }, [resolveReportFields]);

  const resetReport = useCallback(() => {
    setReport(null);
    setReportFields(emptyReportFields);
    setAuditReportStage("BUILDER");
  }, []);

  const loadReport = useCallback(
    async (auth: Level1AuthSession, currentSession: ResearchLabSession) => {
      const nextReport = await getResearchLabReport(
        auth.accessToken,
        currentSession.sessionId
      );
      setReport(nextReport);
      setReportFields(resolveReportFields(nextReport.fields));
      setAuditReportStage(
        nextReport.status === "accepted" ? "SUBMITTED" : "BUILDER"
      );
      return nextReport;
    },
    [resolveReportFields]
  );

  const saveReportDraft = useCallback(async () => {
    if (!session) return null;
    setIsReportSaving(true);
    try {
      const auth = await getAuth();
      const resolvedFields = resolveReportFields(reportFields);
      const nextReport = await saveResearchLabReportDraft({
        accessToken: auth.accessToken,
        fields: resolvedFields,
        sessionId: session.sessionId,
      });
      setReport(nextReport);
      setReportFields(resolveReportFields(nextReport.fields ?? resolvedFields));
      toast.message("Report draft saved");
      return nextReport;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    } finally {
      setIsReportSaving(false);
    }
  }, [getAuth, reportFields, resolveReportFields, session]);

  const submitReport = useCallback(async (options?: {
    acceptedStage?: AuditReportStage;
  }) => {
    if (!activeLab || !session || isReportSubmitting) return null;
    if (!reportFields.titleOptionId || !reportFields.likelihoodOptionId) {
      toast.error("Complete the finding title and likelihood before submitting.");
      return null;
    }

    setIsReportSubmitting(true);
    try {
      const auth = await getAuth();
      const resolvedFields = resolveReportFields(reportFields);
      const saved = await saveResearchLabReportDraft({
        accessToken: auth.accessToken,
        fields: resolvedFields,
        sessionId: session.sessionId,
      });
      setReport(saved);
      setReportFields(resolveReportFields(saved.fields ?? resolvedFields));

      const submitted = await submitResearchLabReport(
        auth.accessToken,
        session.sessionId
      );
      const hydratedSubmitted = {
        ...submitted,
        fields: submitted.fields ?? saved.fields ?? resolvedFields,
      };
      setReport(hydratedSubmitted);
      setReportFields(resolveReportFields(hydratedSubmitted.fields));
      onSessionChange({
        ...session,
        certificateUnlockable:
          hydratedSubmitted.status === "accepted"
            ? true
            : session.certificateUnlockable,
        findingReviewPassed:
          hydratedSubmitted.status === "accepted"
            ? true
            : session.findingReviewPassed,
        labCompleted: Boolean(hydratedSubmitted.labCompleted),
        objectiveProgress: hydratedSubmitted.labCompleted
          ? activeLab.objectives.length
          : session.objectiveProgress,
        reportUnlocked: true,
        reportStatus: hydratedSubmitted.status,
        stage: "report",
        xpAwarded: hydratedSubmitted.xpAwarded,
      });

      if (hydratedSubmitted.status === "accepted" && hydratedSubmitted.labCompleted) {
        setAuditReportStage(options?.acceptedStage ?? "SUBMITTED");
        toast.success(
          `Report accepted. ${hydratedSubmitted.xpAwarded ?? activeLab.xpReward} XP awarded.`
        );
      } else {
        setAuditReportStage("BUILDER");
        toast.error("Report needs revision", {
          description:
            hydratedSubmitted.feedback ??
            "The report needs clearer vulnerability, impact, and remediation details.",
        });
      }
      return hydratedSubmitted;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    } finally {
      setIsReportSubmitting(false);
    }
  }, [
    activeLab,
    getAuth,
    isReportSubmitting,
    onSessionChange,
    reportFields,
    resolveReportFields,
    session,
  ]);

  return {
    auditReportStage,
    isReportSaving,
    isReportSubmitting,
    loadReport,
    populateReportDefaults,
    report,
    reportFields,
    resetReport,
    saveReportDraft,
    setAuditReportStage,
    setReportFields,
    submitReport,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Research Labs request failed.";
  }
}
