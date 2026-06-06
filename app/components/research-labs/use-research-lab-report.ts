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
  defaultReportMetaFields,
  emptyReportFields,
  suggestedReportMetaFields,
  suggestedReportText,
} from "./report-utils";
import type { AuditReportStage, ReportMetaFields } from "./types";

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
  const [reportMetaFields, setReportMetaFields] =
    useState<ReportMetaFields>(defaultReportMetaFields);
  const [auditReportStage, setAuditReportStage] =
    useState<AuditReportStage>("BUILDER");
  const [isReportSaving, setIsReportSaving] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  const populateReportDefaults = useCallback(() => {
    setReportFields((fields) => ({
      ...fields,
      vulnerabilityCategory:
        fields.vulnerabilityCategory ?? "arithmetic_safety",
      affectedArea: fields.affectedArea ?? "vault_health_calculation",
      severity: fields.severity ?? "medium",
      rootCause: fields.rootCause || suggestedReportText.rootCause,
      impact: fields.impact || suggestedReportText.impact,
      proof: fields.proof || suggestedReportText.proof,
      recommendedFix:
        fields.recommendedFix || suggestedReportText.recommendedFix,
    }));
    setReportMetaFields((fields) => ({
      title: fields.title || suggestedReportMetaFields.title,
      likelihood: fields.likelihood || suggestedReportMetaFields.likelihood,
    }));
  }, []);

  const resetReport = useCallback(() => {
    setReport(null);
    setReportFields(emptyReportFields);
    setReportMetaFields(defaultReportMetaFields);
    setAuditReportStage("BUILDER");
  }, []);

  const loadReport = useCallback(
    async (auth: Level1AuthSession, currentSession: ResearchLabSession) => {
      const nextReport = await getResearchLabReport(
        auth.accessToken,
        currentSession.sessionId
      );
      setReport(nextReport);
      setReportFields(nextReport.fields ?? emptyReportFields);
      setReportMetaFields((fields) => ({
        title: fields.title || suggestedReportMetaFields.title,
        likelihood: fields.likelihood || suggestedReportMetaFields.likelihood,
      }));
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
        fields: reportFields,
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
    if (!reportMetaFields.title.trim() || !reportMetaFields.likelihood) {
      toast.error("Complete the finding title and likelihood before submitting.");
      return;
    }

    setIsReportSubmitting(true);
    try {
      const auth = await getAuth();
      const saved = await saveResearchLabReportDraft({
        accessToken: auth.accessToken,
        fields: reportFields,
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
        labCompleted: Boolean(submitted.labCompleted),
        objectiveProgress: submitted.labCompleted
          ? activeLab.objectives.length
          : session.objectiveProgress,
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
    reportMetaFields.likelihood,
    reportMetaFields.title,
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
    reportMetaFields,
    resetReport,
    saveReportDraft,
    setAuditReportStage,
    setReportFields,
    setReportMetaFields,
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
