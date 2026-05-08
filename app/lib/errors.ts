import {
  isSolanaError,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
} from "@solana/kit";
import {
  VAULT_ERROR__COMMANDER_NOT_HIJACKED,
  VAULT_ERROR__DEPOSIT_GOAL_NOT_REACHED,
  VAULT_ERROR__INVALID_LEVEL_OWNER,
  VAULT_ERROR__LEVEL_ALREADY_COMPLETED,
  type VaultError,
} from "../generated/vault";

const VAULT_ERROR_CODES: Record<number, VaultError> = {
  [VAULT_ERROR__COMMANDER_NOT_HIJACKED]: VAULT_ERROR__COMMANDER_NOT_HIJACKED,
  [VAULT_ERROR__DEPOSIT_GOAL_NOT_REACHED]: VAULT_ERROR__DEPOSIT_GOAL_NOT_REACHED,
  [VAULT_ERROR__LEVEL_ALREADY_COMPLETED]: VAULT_ERROR__LEVEL_ALREADY_COMPLETED,
  [VAULT_ERROR__INVALID_LEVEL_OWNER]: VAULT_ERROR__INVALID_LEVEL_OWNER,
};

const VAULT_ERROR_MESSAGES: Record<VaultError, string> = {
  [VAULT_ERROR__COMMANDER_NOT_HIJACKED]:
    "Level 2 is not hijacked yet. Overwrite the global commander first.",
  [VAULT_ERROR__DEPOSIT_GOAL_NOT_REACHED]:
    "Level 1 has not credited the 1,000,000-unit target yet.",
  [VAULT_ERROR__LEVEL_ALREADY_COMPLETED]:
    "This level has already been completed for this wallet.",
  [VAULT_ERROR__INVALID_LEVEL_OWNER]:
    "This level account does not belong to the connected wallet.",
};

export function parseTransactionError(err: unknown): string {
  if (err instanceof Error && err.message.includes("User rejected")) {
    return "Transaction was rejected by the wallet.";
  }

  if (
    isSolanaError(err, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM) &&
    typeof err.context?.code === "number"
  ) {
    const vaultError = VAULT_ERROR_CODES[err.context.code];
    if (vaultError !== undefined) {
      return VAULT_ERROR_MESSAGES[vaultError];
    }
  }

  const message = getDeepestMessage(err);
  return message.length > 220 ? `${message.slice(0, 220)}...` : message;
}

function getDeepestMessage(err: unknown): string {
  let deepest = err instanceof Error ? err.message : String(err);
  let current: unknown = err;

  while (current instanceof Error && current.cause) {
    current = current.cause;
    if (current instanceof Error) {
      deepest = current.message;
    }
  }

  return deepest;
}
