import { getBase58Decoder } from "@solana/kit";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { applyNgrokBypassHeader } from "../backend/ngrok";
import { SOLBREACH_BACKEND_URL } from "./level1-backend";
import type { WalletSession } from "../wallet/types";

export type FutureLevelId = "level4" | "level5";
export type FutureLevelSlug =
  | "level-4-data-matching"
  | "level-5-time-traveler";
export type OptionValue = "safe" | "unsafe";

export const FUTURE_LEVEL_SLUGS: Record<FutureLevelId, FutureLevelSlug> = {
  level4: "level-4-data-matching",
  level5: "level-5-time-traveler",
};

const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const LOG_PREFIX = "[SolBreach Future Levels]";
const levelIdCache = new Map<FutureLevelSlug, string>();

type BackendLevelCatalogItem = {
  id?: unknown;
  level_id?: unknown;
  slug?: unknown;
  uuid?: unknown;
};

export type Level4Challenge = {
  challenge?: unknown;
  expected_collateral_mint?: string;
  exploit_parameters?: Record<string, unknown>;
  level4_state_pda?: string;
  level_session_id?: string;
  market_pda?: string;
  mismatched_collateral_mint?: string;
  mismatched_market_pda?: string;
  mismatched_vault?: string;
  position_pda?: string;
  required_accounts?: string[];
  required_pdas?: string[];
  user_collateral?: string;
  wallet_address?: string;
  collateral_vault?: string;
};

export type Level5Challenge = {
  challenge?: unknown;
  expected_status_after?: "Open" | string;
  expected_status_before?: "Archived" | "Closed" | string;
  exploit_parameters?: Record<string, unknown>;
  level5_state_pda?: string;
  level_session_id?: string;
  lifecycle_registry_pda?: string;
  order_id?: string;
  receipt_pda?: string;
  required_accounts?: string[];
  required_pdas?: string[];
  wallet_address?: string;
};

export type FutureLevelChallenge = Level4Challenge | Level5Challenge;

export type FutureLevelSetupResponse = {
  challenge: FutureLevelChallenge;
  exploit_status?: string;
  level_id: string;
  level_session_id: string;
};

export type FutureLevelStatusResponse = {
  certification?: {
    metadata?: Record<string, unknown>;
    mint_status?: string;
    slug?: string;
    title?: string;
    unlock_status?: string;
  } | null;
  challenge_context?: Partial<FutureLevelChallenge> | null;
  completed?: boolean;
  exploit_status?: string | null;
  level_id: string;
  level_session_id?: string | null;
  state?: string;
  unlock_status?: string;
};

export type FutureLevelSubmitResponse = {
  data?: {
    certification?: {
      metadata?: Record<string, unknown>;
      mint_status?: string;
      slug?: string;
      title?: string;
      unlock_status?: string;
    };
    level_completed?: boolean;
    next_level_unlocked?: boolean;
    submission_status?: string;
    unlocked_level_id?: string;
    xp_awarded?: number;
  };
  error?: {
    code?: string;
    details?: unknown;
    message?: string;
  } | null;
  success?: boolean;
};

export type FutureLevelSelections = Record<string, OptionValue>;

async function backendRequest<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {}
): Promise<T> {
  const { accessToken, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  if (!headers.has("content-type") && fetchOptions.body) {
    headers.set("content-type", "application/json");
  }

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  applyNgrokBypassHeader(headers, SOLBREACH_BACKEND_URL);

  const response = await fetch(`${SOLBREACH_BACKEND_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null
        ? body.error?.message ||
          (typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail ?? body)) ||
          response.statusText
        : response.statusText;
    throw new Error(
      response.status === 401 ? `Unauthorized: ${message}` : message
    );
  }

  return body as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function extractLevels(payload: unknown): BackendLevelCatalogItem[] {
  if (Array.isArray(payload)) return payload as BackendLevelCatalogItem[];

  const value = asRecord(payload);
  for (const key of ["levels", "data", "items", "results"]) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested as BackendLevelCatalogItem[];
    if (nested && typeof nested === "object") {
      const extracted = extractLevels(nested);
      if (extracted.length > 0) return extracted;
    }
  }

  return [];
}

function readLevelIdentifier(level: BackendLevelCatalogItem) {
  const id = level.id ?? level.level_id ?? level.uuid;
  return typeof id === "string" && id.trim() ? id : null;
}

function readLevelSlug(level: BackendLevelCatalogItem) {
  return typeof level.slug === "string" && level.slug.trim()
    ? level.slug
    : null;
}

export async function resolveFutureLevelBackendId(
  accessToken: string,
  levelId: FutureLevelId
) {
  const slug = FUTURE_LEVEL_SLUGS[levelId];
  const cached = levelIdCache.get(slug);
  if (cached) return cached;

  const payload = await backendRequest<unknown>("/api/v1/levels", {
    accessToken,
  });
  const levels = extractLevels(payload);
  const returnedSlugs = levels
    .map(readLevelSlug)
    .filter((item): item is string => Boolean(item));
  console.info(`${LOG_PREFIX} backend level slugs`, returnedSlugs);

  const level = levels.find((item) => item.slug === slug);
  const backendLevelId = level ? readLevelIdentifier(level) : null;

  if (!backendLevelId) {
    throw new Error(
      `Backend sync/setup error: expected vulnerability level slug "${slug}" was not returned by /api/v1/levels. Returned slugs: ${
        returnedSlugs.length > 0 ? returnedSlugs.join(", ") : "none"
      }. Reseed/restart the backend and retry.`
    );
  }

  levelIdCache.set(slug, backendLevelId);
  return backendLevelId;
}

export async function startFutureLevel(
  accessToken: string,
  levelId: FutureLevelId
) {
  const backendLevelId = await resolveFutureLevelBackendId(accessToken, levelId);
  return backendRequest(`/api/v1/levels/${backendLevelId}/start`, {
    accessToken,
    method: "POST",
  });
}

export async function setupFutureLevel({
  accessToken,
  levelId,
  walletAddress,
}: {
  accessToken: string;
  levelId: FutureLevelId;
  walletAddress: string;
}) {
  const backendLevelId = await resolveFutureLevelBackendId(accessToken, levelId);
  return backendRequest<FutureLevelSetupResponse>(
    `/api/v1/levels/${backendLevelId}/setup`,
    {
      accessToken,
      body: JSON.stringify({ wallet_address: walletAddress }),
      method: "POST",
    }
  );
}

export async function fetchFutureLevelBackendStatus(
  accessToken: string,
  levelId: FutureLevelId
) {
  const backendLevelId = await resolveFutureLevelBackendId(accessToken, levelId);
  return backendRequest<FutureLevelStatusResponse>(
    `/api/v1/levels/${backendLevelId}/status`,
    { accessToken }
  );
}

function buildLevel4Proof({
  challenge,
  levelSessionId,
  selections,
  transactionSignature,
  walletAddress,
}: {
  challenge: Level4Challenge;
  levelSessionId: string;
  selections: FutureLevelSelections;
  transactionSignature: string;
  walletAddress: string;
}) {
  const mismatchedVault = selections.vault === "unsafe";

  return {
    proof: {
      data_matching: {
        mismatched_market: selections.position === "unsafe",
        mismatched_mint: selections.mint === "unsafe",
        mismatched_vault: mismatchedVault,
        provided_collateral_vault: mismatchedVault
          ? challenge.mismatched_vault
          : challenge.collateral_vault,
        route_executed: true,
      },
      level_session_id: levelSessionId,
      transaction_signature: transactionSignature,
      wallet_address: walletAddress,
    },
  };
}

function buildLevel5Proof({
  challenge,
  levelSessionId,
  transactionSignature,
  walletAddress,
}: {
  challenge: Level5Challenge;
  levelSessionId: string;
  transactionSignature: string;
  walletAddress: string;
}) {
  return {
    proof: {
      address_reuse: {
        address_reused: true,
        final_status: challenge.expected_status_after ?? "Open",
        generation: 2,
        order_id: challenge.order_id,
        previous_status: challenge.expected_status_before ?? "Archived",
        receipt_pda: challenge.receipt_pda,
        reopened: true,
      },
      level_session_id: levelSessionId,
      transaction_signature: transactionSignature,
      wallet_address: walletAddress,
    },
  };
}

export async function submitFutureLevelProof({
  accessToken,
  challenge,
  levelId,
  levelSessionId,
  selections,
  transactionSignature,
  walletAddress,
}: {
  accessToken: string;
  challenge: FutureLevelChallenge;
  levelId: FutureLevelId;
  levelSessionId: string;
  selections: FutureLevelSelections;
  transactionSignature: string;
  walletAddress: string;
}) {
  const backendLevelId = await resolveFutureLevelBackendId(accessToken, levelId);
  const body =
    levelId === "level4"
      ? buildLevel4Proof({
          challenge: challenge as Level4Challenge,
          levelSessionId,
          selections,
          transactionSignature,
          walletAddress,
        })
      : buildLevel5Proof({
          challenge: challenge as Level5Challenge,
          levelSessionId,
          transactionSignature,
          walletAddress,
        });

  console.info(`${LOG_PREFIX} backend submit start`, {
    levelId,
    ...body,
  });

  const result = await backendRequest<FutureLevelSubmitResponse>(
    `/api/v1/levels/${backendLevelId}/submit`,
    {
      accessToken,
      body: JSON.stringify(body),
      method: "POST",
    }
  );

  if (result.success === false || result.error) {
    throw new Error(
      result.error
        ? JSON.stringify(result.error)
        : `${levelId} verification failed.`
    );
  }

  console.info(`${LOG_PREFIX} backend submit success`, result);
  return result;
}

function uniqueChallengeAccounts(challenge: FutureLevelChallenge) {
  const candidates = [
    ...(challenge.required_accounts ?? []),
    ...(challenge.required_pdas ?? []),
    ...Object.entries(challenge)
      .filter(([key, value]) => key.endsWith("_pda") && typeof value === "string")
      .map(([, value]) => value as string),
  ];

  return Array.from(new Set(candidates)).filter(Boolean);
}

function logFutureLevelError(label: string, error: unknown) {
  console.error(`${LOG_PREFIX} ${label}`, error);
  if (error instanceof Error && error.stack) {
    console.error(`${LOG_PREFIX} ${label} stack`, error.stack);
  }
}

export async function executeFutureLevelProofTransaction({
  challenge,
  levelId,
  wallet,
}: {
  challenge: FutureLevelChallenge;
  levelId: FutureLevelId;
  wallet: WalletSession;
}) {
  try {
    const connection = new Connection(DEVNET_RPC_URL, "confirmed");
    const walletPublicKey = new PublicKey(wallet.account.address);
    const requiredAccountKeys = uniqueChallengeAccounts(challenge)
      .filter((account) => account !== wallet.account.address)
      .map((account) => ({
        isSigner: false,
        isWritable: false,
        pubkey: new PublicKey(account),
      }));

    console.info(`${LOG_PREFIX} tx construction start`, {
      includedAccounts: requiredAccountKeys.map((key) => key.pubkey.toBase58()),
      levelId,
      simulation: "zero-lamport system transfer",
      wallet: wallet.account.address,
    });

    const transaction = new Transaction();
    const deterministicInstruction = SystemProgram.transfer({
      fromPubkey: walletPublicKey,
      lamports: 0,
      toPubkey: walletPublicKey,
    });
    deterministicInstruction.keys = [
      ...deterministicInstruction.keys.map((key) => ({
        ...key,
        isSigner: key.pubkey.equals(walletPublicKey),
      })),
      ...requiredAccountKeys,
    ];
    transaction.add(deterministicInstruction);

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    transaction.feePayer = walletPublicKey;
    transaction.recentBlockhash = latestBlockhash.blockhash;

    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    const signTransaction = wallet.signTransaction;
    const sendTransaction = wallet.sendTransaction;

    if (!signTransaction && !sendTransaction) {
      throw new Error("Connected wallet cannot sign Solana transactions.");
    }

    if (!signTransaction && sendTransaction) {
      const signatureBytes = await sendTransaction(
        new Uint8Array(serialized),
        "solana:devnet"
      );
      const signature = getBase58Decoder().decode(signatureBytes);
      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );
      return signature;
    }

    if (!signTransaction) {
      throw new Error("Connected wallet cannot sign Solana transactions.");
    }

    const signed = await signTransaction(
      new Uint8Array(serialized),
      "solana:devnet"
    );
    const signature = await connection.sendRawTransaction(signed, {
      skipPreflight: false,
    });
    await connection.confirmTransaction(
      { signature, ...latestBlockhash },
      "confirmed"
    );
    return signature;
  } catch (error) {
    logFutureLevelError("proof transaction failed", error);
    throw error;
  }
}
