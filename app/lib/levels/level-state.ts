import {
  address as toAddress,
  isAddress,
  type Address,
} from "@solana/kit";
import {
  fetchMaybeBankConfig,
  fetchMaybeGuildAuthority,
  fetchMaybeLevel0State,
  fetchMaybeLevel1State,
  fetchMaybeLevel2State,
  fetchMaybeLevel3State,
  fetchMaybeUserProfile,
  fetchMaybeUserStats,
  findBankPda,
  findGuildAuthorityPda,
  findLevel1StatePda,
  findLevel2StatePda,
  findLevel3StatePda,
  findProfilePda,
  getInitLevel0InstructionAsync,
  getInitUserStatsInstructionAsync,
} from "../../generated/vault";

type VaultRpc = Parameters<typeof fetchMaybeUserStats>[0];
type Level0User = Parameters<typeof getInitUserStatsInstructionAsync>[0]["user"];
type TokenBalanceRpc = {
  getTokenAccountBalance(address: Address): {
    send(): Promise<{ value: { amount: string } }>;
  };
};

export type Level0Snapshot = {
  userStatsPda: Address;
  level0StatePda: Address;
  hasUserStats: boolean;
  hasLevel0State: boolean;
  completedLevels: boolean[];
  isCompleted: boolean;
};

export type Level1Snapshot = {
  bankPda: Address;
  level1StatePda: Address;
  hasBank: boolean;
  expectedMint: Address | null;
  hasLevel1State: boolean;
  depositedAmount: bigint;
};

export type Level2Snapshot = {
  profilePda: Address;
  level2StatePda: Address;
  hasProfile: boolean;
  commander: Address | null;
  hasLevel2State: boolean;
};

export type Level3Snapshot = {
  guildAuthorityPda: Address;
  level3StatePda: Address;
  hasGuildAuthority: boolean;
  rewardMint: Address | null;
  bountyVault: Address | null;
  bountyAmount: bigint;
  hasLevel3State: boolean;
  rewardAccount: Address | null;
  rewardAmount: bigint;
};

export async function fetchLevel0Snapshot({
  rpc,
  user,
}: {
  rpc: VaultRpc;
  user: Level0User;
}): Promise<Level0Snapshot> {
  const [initStatsIx, initLevel0Ix] = await Promise.all([
    getInitUserStatsInstructionAsync({ user }),
    getInitLevel0InstructionAsync({ user }),
  ]);

  const userStatsPda = initStatsIx.accounts[1].address;
  const level0StatePda = initLevel0Ix.accounts[2].address;

  const [userStatsAccount, level0StateAccount] = await Promise.all([
    fetchMaybeUserStats(rpc, userStatsPda),
    fetchMaybeLevel0State(rpc, level0StatePda),
  ]);

  const hasUserStats = userStatsAccount.exists;
  const hasLevel0State = level0StateAccount.exists;
  const completedLevels = hasUserStats
    ? [...userStatsAccount.data.completedLevels]
    : [false, false, false, false];
  const isCompleted = completedLevels[0] ?? false;

  return {
    userStatsPda,
    level0StatePda,
    hasUserStats,
    hasLevel0State,
    completedLevels,
    isCompleted,
  };
}

export async function fetchLevel1Snapshot({
  playerAddress,
  rpc,
}: {
  playerAddress: string;
  rpc: VaultRpc;
}): Promise<Level1Snapshot> {
  const [[bankPda], [level1StatePda]] = await Promise.all([
    findBankPda(),
    findLevel1StatePda({ user: toAddress(playerAddress) }),
  ]);

  const [bankAccount, level1Account] = await Promise.all([
    fetchMaybeBankConfig(rpc, bankPda),
    fetchMaybeLevel1State(rpc, level1StatePda),
  ]);

  return {
    bankPda,
    level1StatePda,
    hasBank: bankAccount.exists,
    expectedMint: bankAccount.exists ? bankAccount.data.expectedMint : null,
    hasLevel1State: level1Account.exists,
    depositedAmount: level1Account.exists
      ? level1Account.data.depositedAmount
      : 0n,
  };
}

export async function fetchLevel2Snapshot({
  playerAddress,
  rpc,
}: {
  playerAddress: string;
  rpc: VaultRpc;
}): Promise<Level2Snapshot> {
  const [[profilePda], [level2StatePda]] = await Promise.all([
    findProfilePda(),
    findLevel2StatePda({ user: toAddress(playerAddress) }),
  ]);

  const [profileAccount, level2Account] = await Promise.all([
    fetchMaybeUserProfile(rpc, profilePda),
    fetchMaybeLevel2State(rpc, level2StatePda),
  ]);

  return {
    profilePda,
    level2StatePda,
    hasProfile: profileAccount.exists,
    commander: profileAccount.exists ? profileAccount.data.commander : null,
    hasLevel2State: level2Account.exists,
  };
}

export async function fetchLevel3Snapshot({
  playerAddress,
  rewardAccountInput,
  rpc,
}: {
  playerAddress: string;
  rewardAccountInput: string;
  rpc: VaultRpc & TokenBalanceRpc;
}): Promise<Level3Snapshot> {
  const [[guildAuthorityPda], [level3StatePda]] = await Promise.all([
    findGuildAuthorityPda(),
    findLevel3StatePda({ user: toAddress(playerAddress) }),
  ]);

  const [guildAuthorityAccount, level3Account] = await Promise.all([
    fetchMaybeGuildAuthority(rpc, guildAuthorityPda),
    fetchMaybeLevel3State(rpc, level3StatePda),
  ]);

  const trimmedRewardAccount = rewardAccountInput.trim();
  const rewardAccount = isAddress(trimmedRewardAccount)
    ? toAddress(trimmedRewardAccount)
    : null;

  let rewardAmount = 0n;
  if (rewardAccount) {
    try {
      const { value } = await rpc.getTokenAccountBalance(rewardAccount).send();
      rewardAmount = BigInt(value.amount);
    } catch {
      rewardAmount = 0n;
    }
  }

  return {
    guildAuthorityPda,
    level3StatePda,
    hasGuildAuthority: guildAuthorityAccount.exists,
    rewardMint: guildAuthorityAccount.exists
      ? guildAuthorityAccount.data.rewardMint
      : null,
    bountyVault: guildAuthorityAccount.exists
      ? guildAuthorityAccount.data.bountyVault
      : null,
    bountyAmount: guildAuthorityAccount.exists
      ? guildAuthorityAccount.data.bountyAmount
      : 0n,
    hasLevel3State: level3Account.exists,
    rewardAccount,
    rewardAmount,
  };
}
