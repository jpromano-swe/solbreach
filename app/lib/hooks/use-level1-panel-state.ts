"use client";

import { useMemo } from "react";
import { address as toAddress, isAddress, type Address } from "@solana/kit";
import type {
  Level1Challenge,
  Level1StatusResponse,
} from "../levels/level1-backend";
import type { Level1Snapshot } from "../levels/level-state";

const LEVEL_1_TARGET = 1_000_000n;

export function useLevel1PanelState({
  defaultBankPda,
  isLevel1BackendBusy,
  isLevel1BackendLoading,
  isLevel1Loading,
  level1BackendCompleted,
  level1BackendError,
  level1BackendStatus,
  level1Challenge,
  level1Error,
  level1State,
}: {
  defaultBankPda: Address;
  isLevel1BackendBusy: boolean;
  isLevel1BackendLoading: boolean;
  isLevel1Loading: boolean;
  level1BackendCompleted: boolean;
  level1BackendError?: unknown;
  level1BackendStatus?: Level1StatusResponse;
  level1Challenge?: Level1Challenge | null;
  level1Error?: unknown;
  level1State?: Level1Snapshot;
}) {
  const level1PanelState = useMemo<Level1Snapshot | undefined>(() => {
    const panelChallenge =
      level1Challenge ?? level1BackendStatus?.challenge_context ?? null;

    if (!panelChallenge) {
      return level1State;
    }

    const panelPda =
      panelChallenge.challenge_pda && isAddress(panelChallenge.challenge_pda)
        ? toAddress(panelChallenge.challenge_pda)
        : (level1State?.bankPda ?? defaultBankPda);
    const panelExpectedMint =
      panelChallenge.official_mint && isAddress(panelChallenge.official_mint)
        ? toAddress(panelChallenge.official_mint)
        : (level1State?.expectedMint ?? null);

    return {
      bankPda: panelPda,
      depositedAmount: level1BackendCompleted
        ? LEVEL_1_TARGET
        : (level1State?.depositedAmount ?? 0n),
      expectedMint: panelExpectedMint,
      hasBank: true,
      hasLevel1State: Boolean(
        level1BackendStatus?.level_session_id || level1State?.hasLevel1State
      ),
      level1StatePda: panelPda,
    };
  }, [
    defaultBankPda,
    level1BackendCompleted,
    level1BackendStatus,
    level1Challenge,
    level1State,
  ]);

  return {
    isLevel1PanelLoading:
      isLevel1Loading || isLevel1BackendLoading || isLevel1BackendBusy,
    level1PanelError: level1BackendError ?? level1Error,
    level1PanelState,
  };
}
