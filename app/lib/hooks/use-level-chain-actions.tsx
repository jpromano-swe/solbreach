"use client";

import { useCallback } from "react";
import {
  address as toAddress,
  isAddress,
  type Address,
  type Instruction,
} from "@solana/kit";
import { toast } from "sonner";
import { parseTransactionError } from "../errors";
import type { Level3Snapshot } from "../levels/level-state";
import {
  getDelegateTaskInstructionAsync,
  getDepositTokensInstructionAsync,
  getInitBankInstructionAsync,
  getInitGuildAuthorityInstructionAsync,
  getInitGlobalProfileInstructionAsync,
  getInitLevel0InstructionAsync,
  getInitLevel1InstructionAsync,
  getInitLevel2InstructionAsync,
  getInitLevel3InstructionAsync,
  getInitUserStatsInstructionAsync,
  getUpdateProfileInstructionAsync,
  getVerifyAndCloseLevel0InstructionAsync,
  getVerifyAndCloseLevel1InstructionAsync,
  getVerifyAndCloseLevel2InstructionAsync,
  getVerifyAndCloseLevel3InstructionAsync,
} from "../../generated/vault";

type ChainSigner = Parameters<
  typeof getInitUserStatsInstructionAsync
>[0]["user"];
type SendInstruction = (input: {
  instructions: Instruction[];
}) => Promise<string>;

const MERCENARY_FOLLOW_ORDERS_DISCRIMINATOR = new Uint8Array([
  222, 50, 96, 140, 105, 24, 81, 44,
]);

function parseAddressInput(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  if (!isAddress(trimmed)) {
    throw new Error(`${label} is not a valid Solana address.`);
  }
  return toAddress(trimmed);
}

function parseAmountInput(value: string) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      "Deposit amount must be a whole number of raw token units."
    );
  }
  return BigInt(trimmed);
}

export function useLevelChainActions({
  address,
  getExplorerUrl,
  level1Amount,
  level1ExpectedMint,
  level1UserTokenAccount,
  level1Vault,
  level2InitialCommander,
  level3Amount,
  level3BountyVault,
  level3ExternalProgram,
  level3RewardMint,
  level3State,
  level3UserRewardAccount,
  refreshState,
  send,
  signer,
}: {
  address?: Address;
  getExplorerUrl: (path: string) => string;
  level1Amount: string;
  level1ExpectedMint: string;
  level1UserTokenAccount: string;
  level1Vault: string;
  level2InitialCommander: string;
  level3Amount: string;
  level3BountyVault: string;
  level3ExternalProgram: string;
  level3RewardMint: string;
  level3State?: Level3Snapshot;
  level3UserRewardAccount: string;
  refreshState: () => Promise<void>;
  send: SendInstruction;
  signer?: ChainSigner | null;
}) {
  const runInstruction = useCallback(
    async (
      buildInstruction: () => Promise<Instruction>,
      successTitle: string,
      successDescription: string
    ) => {
      if (!signer) return;

      try {
        const instruction = await buildInstruction();
        const signature = await send({ instructions: [instruction] });

        await refreshState();

        toast.success(successTitle, {
          description: (
            <a
              href={getExplorerUrl(`/tx/${signature}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {successDescription}
            </a>
          ),
        });
      } catch (err) {
        console.error("Transaction failed:", err);
        toast.error(parseTransactionError(err));
      }
    },
    [getExplorerUrl, refreshState, send, signer]
  );

  const handleInitStats = useCallback(async () => {
    await runInstruction(
      () => getInitUserStatsInstructionAsync({ user: signer! }),
      "User registry created.",
      "View init_user_stats transaction"
    );
  }, [runInstruction, signer]);

  const handleInitLevel0 = useCallback(async () => {
    await runInstruction(
      () => getInitLevel0InstructionAsync({ user: signer! }),
      "Level 0 initialized.",
      "View init_level_0 transaction"
    );
  }, [runInstruction, signer]);

  const handleVerifyLevel0 = useCallback(async () => {
    await runInstruction(
      () => getVerifyAndCloseLevel0InstructionAsync({ user: signer! }),
      "Level 0 completed.",
      "View verify_and_close_level_0 transaction"
    );
  }, [runInstruction, signer]);

  const handleInitBank = useCallback(async () => {
    await runInstruction(
      () =>
        getInitBankInstructionAsync({
          admin: signer!,
          expectedMint: parseAddressInput(level1ExpectedMint, "Expected mint"),
        }),
      "Bank initialized.",
      "View init_bank transaction"
    );
  }, [level1ExpectedMint, runInstruction, signer]);

  const handleInitLevel1 = useCallback(async () => {
    await runInstruction(
      () => getInitLevel1InstructionAsync({ user: signer! }),
      "Level 1 initialized.",
      "View init_level_1 transaction"
    );
  }, [runInstruction, signer]);

  const handleDepositLevel1 = useCallback(async () => {
    await runInstruction(
      () =>
        getDepositTokensInstructionAsync({
          user: signer!,
          vault: parseAddressInput(level1Vault, "Vault token account"),
          userTokenAccount: parseAddressInput(
            level1UserTokenAccount,
            "User token account"
          ),
          amount: parseAmountInput(level1Amount),
        }),
      "Exploit deposit submitted.",
      "View deposit_tokens transaction"
    );
  }, [
    level1Amount,
    level1UserTokenAccount,
    level1Vault,
    runInstruction,
    signer,
  ]);

  const handleVerifyLevel1 = useCallback(async () => {
    await runInstruction(
      () => getVerifyAndCloseLevel1InstructionAsync({ user: signer! }),
      "Level 1 completed.",
      "View verify_and_close_level_1 transaction"
    );
  }, [runInstruction, signer]);

  const handleInitGlobalProfile = useCallback(async () => {
    await runInstruction(
      () => {
        const initialCommander = parseAddressInput(
          level2InitialCommander,
          "Initial commander"
        );
        if (address && initialCommander === address) {
          throw new Error(
            "Initial commander must be different from the connected wallet."
          );
        }

        return getInitGlobalProfileInstructionAsync({
          admin: signer!,
          initialCommander,
        });
      },
      "Global profile bootstrapped.",
      "View init_global_profile transaction"
    );
  }, [address, level2InitialCommander, runInstruction, signer]);

  const handleInitLevel2 = useCallback(async () => {
    await runInstruction(
      () => getInitLevel2InstructionAsync({ user: signer! }),
      "Level 2 initialized.",
      "View init_level_2 transaction"
    );
  }, [runInstruction, signer]);

  const handleUpdateProfile = useCallback(async () => {
    await runInstruction(
      () => getUpdateProfileInstructionAsync({ user: signer! }),
      "Commander registry overwritten.",
      "View update_profile transaction"
    );
  }, [runInstruction, signer]);

  const handleVerifyLevel2 = useCallback(async () => {
    await runInstruction(
      () => getVerifyAndCloseLevel2InstructionAsync({ user: signer! }),
      "Level 2 completed.",
      "View verify_and_close_level_2 transaction"
    );
  }, [runInstruction, signer]);

  const handleInitGuildAuthority = useCallback(async () => {
    await runInstruction(
      () =>
        getInitGuildAuthorityInstructionAsync({
          admin: signer!,
          rewardMint: parseAddressInput(level3RewardMint, "Reward mint"),
          bountyVault: parseAddressInput(level3BountyVault, "Bounty vault"),
          bountyAmount: parseAmountInput(level3Amount),
        }),
      "Guild authority bootstrapped.",
      "View init_guild_authority transaction"
    );
  }, [
    level3Amount,
    level3BountyVault,
    level3RewardMint,
    runInstruction,
    signer,
  ]);

  const handleInitLevel3 = useCallback(async () => {
    await runInstruction(
      () => getInitLevel3InstructionAsync({ user: signer! }),
      "Level 3 initialized.",
      "View init_level_3 transaction"
    );
  }, [runInstruction, signer]);

  const handleDelegateTask = useCallback(async () => {
    await runInstruction(
      async () => {
        const amount =
          level3State?.bountyAmount || parseAmountInput(level3Amount);
        const taskData = new Uint8Array(16);
        taskData.set(MERCENARY_FOLLOW_ORDERS_DISCRIMINATOR, 0);
        new DataView(taskData.buffer).setBigUint64(8, amount, true);

        return getDelegateTaskInstructionAsync({
          user: signer!,
          bountyVault:
            level3State?.bountyVault ??
            parseAddressInput(level3BountyVault, "Bounty vault"),
          userRewardAccount: parseAddressInput(
            level3UserRewardAccount,
            "User reward account"
          ),
          externalProgram: parseAddressInput(
            level3ExternalProgram,
            "External program"
          ),
          taskData,
        });
      },
      "Delegated CPI submitted.",
      "View delegate_task transaction"
    );
  }, [
    level3Amount,
    level3BountyVault,
    level3ExternalProgram,
    level3State,
    level3UserRewardAccount,
    runInstruction,
    signer,
  ]);

  const handleVerifyLevel3 = useCallback(async () => {
    await runInstruction(
      () =>
        getVerifyAndCloseLevel3InstructionAsync({
          user: signer!,
          userRewardAccount: parseAddressInput(
            level3UserRewardAccount,
            "User reward account"
          ),
        }),
      "Level 3 completed.",
      "View verify_and_close_level_3 transaction"
    );
  }, [level3UserRewardAccount, runInstruction, signer]);

  return {
    handleDepositLevel1,
    handleDelegateTask,
    handleInitBank,
    handleInitGlobalProfile,
    handleInitGuildAuthority,
    handleInitLevel0,
    handleInitLevel1,
    handleInitLevel2,
    handleInitLevel3,
    handleInitStats,
    handleUpdateProfile,
    handleVerifyLevel0,
    handleVerifyLevel1,
    handleVerifyLevel2,
    handleVerifyLevel3,
  };
}
