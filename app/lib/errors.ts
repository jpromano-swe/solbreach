import {
  isSolanaError,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
} from "@solana/kit";
import {
  VAULT_ERROR__CERTIFICATE_ASSET_ALREADY_RECORDED,
  VAULT_ERROR__COMMANDER_NOT_HIJACKED,
  VAULT_ERROR__DELEGATION_NOT_HIJACKED,
  VAULT_ERROR__DEPOSIT_GOAL_NOT_REACHED,
  VAULT_ERROR__INVALID_LEVEL_INDEX,
  VAULT_ERROR__INVALID_LEVEL_OWNER,
  VAULT_ERROR__LEVEL_ALREADY_COMPLETED,
  VAULT_ERROR__LEVEL_NOT_COMPLETED,
  VAULT_ERROR__MISSING_GUILD_AUTHORITY_SIGNER,
  VAULT_ERROR__UNAUTHORIZED_CERTIFICATION_AUTHORITY,
  type VaultError,
} from "../generated/vault";

const VAULT_ERROR_CODES: Record<number, VaultError> = {
  [VAULT_ERROR__CERTIFICATE_ASSET_ALREADY_RECORDED]:
    VAULT_ERROR__CERTIFICATE_ASSET_ALREADY_RECORDED,
  [VAULT_ERROR__COMMANDER_NOT_HIJACKED]: VAULT_ERROR__COMMANDER_NOT_HIJACKED,
  [VAULT_ERROR__DELEGATION_NOT_HIJACKED]:
    VAULT_ERROR__DELEGATION_NOT_HIJACKED,
  [VAULT_ERROR__DEPOSIT_GOAL_NOT_REACHED]: VAULT_ERROR__DEPOSIT_GOAL_NOT_REACHED,
  [VAULT_ERROR__INVALID_LEVEL_INDEX]: VAULT_ERROR__INVALID_LEVEL_INDEX,
  [VAULT_ERROR__LEVEL_ALREADY_COMPLETED]: VAULT_ERROR__LEVEL_ALREADY_COMPLETED,
  [VAULT_ERROR__LEVEL_NOT_COMPLETED]: VAULT_ERROR__LEVEL_NOT_COMPLETED,
  [VAULT_ERROR__INVALID_LEVEL_OWNER]: VAULT_ERROR__INVALID_LEVEL_OWNER,
  [VAULT_ERROR__MISSING_GUILD_AUTHORITY_SIGNER]:
    VAULT_ERROR__MISSING_GUILD_AUTHORITY_SIGNER,
  [VAULT_ERROR__UNAUTHORIZED_CERTIFICATION_AUTHORITY]:
    VAULT_ERROR__UNAUTHORIZED_CERTIFICATION_AUTHORITY,
};

const VAULT_ERROR_MESSAGES: Record<VaultError, string> = {
  [VAULT_ERROR__CERTIFICATE_ASSET_ALREADY_RECORDED]:
    "This wallet already has a recorded SolBreach certificate asset for that level.",
  [VAULT_ERROR__COMMANDER_NOT_HIJACKED]:
    "Level 2 is not hijacked yet. Overwrite the global commander first.",
  [VAULT_ERROR__DELEGATION_NOT_HIJACKED]:
    "Level 3 has not drained the guild bounty yet. Run the delegated CPI first.",
  [VAULT_ERROR__DEPOSIT_GOAL_NOT_REACHED]:
    "Level 1 has not credited the 1,000,000-unit target yet.",
  [VAULT_ERROR__INVALID_LEVEL_INDEX]:
    "That level index is invalid for SolBreach certificate minting.",
  [VAULT_ERROR__LEVEL_ALREADY_COMPLETED]:
    "This level has already been completed for this wallet.",
  [VAULT_ERROR__LEVEL_NOT_COMPLETED]:
    "This wallet has not completed the requested SolBreach level yet.",
  [VAULT_ERROR__INVALID_LEVEL_OWNER]:
    "This level account does not belong to the connected wallet.",
  [VAULT_ERROR__MISSING_GUILD_AUTHORITY_SIGNER]:
    "The delegated program did not receive the guild authority signer it expected.",
  [VAULT_ERROR__UNAUTHORIZED_CERTIFICATION_AUTHORITY]:
    "The connected signer is not allowed to bind cNFT certification assets.",
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
