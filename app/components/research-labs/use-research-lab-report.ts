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
  suggestedReportFieldDefaults,
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
  const [report, setReport] = useState<ResearchLabReport | null>(null);
  const [reportFields, setReportFields] =
    useState<ResearchLabReportFields>(emptyReportFields);
  const [auditReportStage, setAuditReportStage] =
    useState<AuditReportStage>("BUILDER");
  const [isReportSaving, setIsReportSaving] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  const populateReportDefaults = useCallback(() => {
    setReportFields((fields) => ({
      ...fields,
      titleOptionId:
        fields.titleOptionId ?? suggestedReportFieldDefaults.titleOptionId ?? null,
      categoryOptionId:
        fields.categoryOptionId ??
        suggestedReportFieldDefaults.categoryOptionId ??
        null,
      severityOptionId:
        fields.severityOptionId ??
        suggestedReportFieldDefaults.severityOptionId ??
        null,
      likelihoodOptionId:
        fields.likelihoodOptionId ??
        suggestedReportFieldDefaults.likelihoodOptionId ??
        null,
      rootCauseOptionId:
        fields.rootCauseOptionId ??
        suggestedReportFieldDefaults.rootCauseOptionId ??
        null,
      proofOfImpactOptionId:
        fields.proofOfImpactOptionId ??
        suggestedReportFieldDefaults.proofOfImpactOptionId ??
        null,
      recommendedMitigationOptionId:
        fields.recommendedMitigationOptionId ??
        suggestedReportFieldDefaults.recommendedMitigationOptionId ??
        null,
      verifiedEvidenceRefs:
        fields.verifiedEvidenceRefs.length
          ? fields.verifiedEvidenceRefs
          : session?.verifiedEvidenceRefs ?? [],
    }));
  }, [session?.verifiedEvidenceRefs]);

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
      setReportFields(
        nextReport.fields
          ? {
              ...emptyReportFields,
              ...nextReport.fields,
              verifiedEvidenceRefs:
                nextReport.fields.verifiedEvidenceRefs.length
                  ? nextReport.fields.verifiedEvidenceRefs
                  : currentSession.verifiedEvidenceRefs ?? [],
            }
          : {
              ...emptyReportFields,
              verifiedEvidenceRefs: currentSession.verifiedEvidenceRefs ?? [],
            }
      );
      setAuditReportStage(
        nextReport.status === "accepted" ? "SUBMITTED" : "BUILDER"
      );
      return nextReport;
    },
    []
  );

  const saveReportDraft = useCallback(async () => {
    if (!session) return null;
    setIsReportSaving(true);
    try {
      const auth = await getAuth();
      const nextReport = await saveResearchLabReportDraft({
        accessToken: auth.accessToken,
        fields: {
          ...reportFields,
          verifiedEvidenceRefs:
            reportFields.verifiedEvidenceRefs.length
              ? reportFields.verifiedEvidenceRefs
              : session.verifiedEvidenceRefs ?? [],
        },
        sessionId: session.sessionId,
      });
      setReport(nextReport);
      toast.message("Report draft saved");
      return nextReport;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    } finally {
      setIsReportSaving(false);
    }
  }, [getAuth, reportFields, session]);

  const submitReport = useCallback(async () => {
    if (!activeLab || !session || isReportSubmitting) return;
    if (!reportFields.titleOptionId || !reportFields.likelihoodOptionId) {
      toast.error("Complete the finding title and likelihood before submitting.");
      return;
    }

    setIsReportSubmitting(true);
    try {
      const auth = await getAuth();
      const saved = await saveResearchLabReportDraft({
        accessToken: auth.accessToken,
        fields: {
          ...reportFields,
          verifiedEvidenceRefs:
            reportFields.verifiedEvidenceRefs.length
              ? reportFields.verifiedEvidenceRefs
              : session.verifiedEvidenceRefs ?? [],
        },
        sessionId: session.sessionId,
      });
      setReport(saved);

      const submitted = await submitResearchLabReport(
        auth.accessToken,
        session.sessionId
      );
      setReport(submitted);
      onSessionChange({
        ...session,
        certificateUnlockable:
          submitted.status === "accepted" ? true : session.certificateUnlockable,
        findingReviewPassed:
          submitted.status === "accepted" ? true : session.findingReviewPassed,
        labCompleted: Boolean(submitted.labCompleted),
        objectiveProgress: submitted.labCompleted
          ? activeLab.objectives.length
          : session.objectiveProgress,
        reportUnlocked: true,
        reportStatus: submitted.status,
        stage: "report",
        xpAwarded: submitted.xpAwarded,
      });

      if (submitted.status === "accepted" && submitted.labCompleted) {
        setAuditReportStage("SUBMITTED");
        toast.success(
          `Report accepted. ${submitted.xpAwarded ?? activeLab.xpReward} XP awarded.`
        );
      } else {
        setAuditReportStage("BUILDER");
        toast.error("Report needs revision", {
          description:
            submitted.feedback ??
            "The report needs clearer vulnerability, impact, and remediation details.",
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsReportSubmitting(false);
    }
  }, [
    activeLab,
    getAuth,
    isReportSubmitting,
    onSessionChange,
    reportFields,
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
