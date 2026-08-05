export type LevelId =
  | "level0"
  | "level1"
  | "level2"
  | "level3"
  | "level4"
  | "level5";
export type LevelsView = "landing" | LevelId;
export type LevelStatus =
  | "ready"
  | "live"
  | "cleared"
  | "armed"
  | "mint"
  | "locked";

export type LevelTileConfig = {
  id: LevelId;
  index: string;
  label: string;
  title: string;
  status: LevelStatus;
  summary: string;
};

export const LEVEL_NUMBERS = [0, 1, 2, 3] as const;

export function getStatusLabel(status: LevelStatus) {
  switch (status) {
    case "ready":
      return "Ready";
    case "live":
      return "Live";
    case "cleared":
      return "Cleared";
    case "armed":
      return "Armed";
    case "mint":
      return "Mint";
    case "locked":
      return "Locked";
  }
}

export function buildLevelTiles({
  level0Completed,
  level0HasLevelState,
  level1Completed,
  level1DepositReady,
  level1HasLevelState,
  level2Completed,
  level2HasLevelState,
  level2HasProfile,
  level2Hijacked,
  level3Completed,
  level3DelegationReady,
  level3HasGuildAuthority,
  level3HasLevelState,
}: {
  level0Completed?: boolean;
  level0HasLevelState?: boolean;
  level1Completed: boolean;
  level1DepositReady: boolean;
  level1HasLevelState?: boolean;
  level2Completed: boolean;
  level2HasLevelState?: boolean;
  level2HasProfile?: boolean;
  level2Hijacked: boolean;
  level3Completed: boolean;
  level3DelegationReady: boolean;
  level3HasGuildAuthority?: boolean;
  level3HasLevelState?: boolean;
}): LevelTileConfig[] {
  const level0Status: LevelStatus = level0Completed
    ? "cleared"
    : level0HasLevelState
      ? "live"
      : "ready";

  const level1Status: LevelStatus = level1Completed
      ? "cleared"
      : level1DepositReady
        ? "armed"
        : level1HasLevelState
          ? "live"
          : "ready";

  const level2Status: LevelStatus = level2Completed
      ? "cleared"
      : level2Hijacked
        ? "armed"
        : level2HasProfile || level2HasLevelState
          ? "live"
          : "ready";

  const level3Status: LevelStatus = level3Completed
      ? "cleared"
      : level3DelegationReady
        ? "armed"
        : level3HasGuildAuthority || level3HasLevelState
          ? "live"
          : "ready";

  return [
    {
      id: "level0",
      index: "00",
      label: "Warmup",
      title: "Wallet Handshake",
      status: level0Status,
      summary: "Create registry, open PDA, close it correctly.",
    },
    {
      id: "level1",
      index: "01",
      label: "Account substitution",
      title: "Illusionist",
      status: level1Status,
      summary: "Exploit the missing mint constraint and forge the ledger.",
    },
    {
      id: "level2",
      index: "02",
      label: "PDA authority bypass",
      title: "Identity Thief",
      status: level2Status,
      summary: "Hijack the global profile PDA and become commander.",
    },
    {
      id: "level3",
      index: "03",
      label: "Arbitrary CPI",
      title: "Trojan Horse",
      status: level3Status,
      summary: "Abuse arbitrary CPI and the forwarded guild signer.",
    },
    {
      id: "level4",
      index: "04",
      label: "Data matching",
      title: "Mirror Trap",
      status: "ready",
      summary: "Match stored account data before protocol state changes.",
    },
    {
      id: "level5",
      index: "05",
      label: "Address reuse",
      title: "Time Traveler",
      status: "ready",
      summary: "Reuse a deterministic PDA address through unsafe lifecycle handling.",
    },
  ];
}
