import { getBase58Decoder } from "@solana/kit";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { WalletSession } from "../wallet/types";

export const SOLBREACH_BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "https://1t2iexn742.execute-api.sa-east-1.amazonaws.com/backend-testing";
export const LEVEL_1_BACKEND_ID = "96d2111d-bb01-5a1b-9536-57331fed473e";

const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const AUTH_STORAGE_KEY = "solbreach.backend.walletAuth";
const LOG_PREFIX = "[SolBreach Level 1]";

export type Level1AuthSession = {
  accessToken: string;
  refreshToken: string;
  role?: string;
  walletAddress: string;
};

export type Level1Challenge = {
  official_mint: string;
  official_vault: string;
  fake_mint: string;
  fake_vault: string;
  challenge_pda: string;
  attacker_token_account: string;
  required_accounts: string[];
  exploit_parameters?: {
    expected_attacker_token_delta?: number;
    expected_vault_delta?: number;
  };
};

export type Level1SetupResponse = {
  level_id: string;
  level_session_id: string;
  exploit_status: string;
  challenge: Level1Challenge;
};

export type Level1StatusResponse = {
  level_id: string;
  state?: string;
  unlock_status?: string;
  completed: boolean;
  exploit_status?: string | null;
  level_session_id?: string | null;
  challenge_context?: Partial<Level1Challenge> | null;
};

export type Level1SubmitResponse = {
  success: boolean;
  data?: unknown;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type AuthResponse = {
  user?: {
    role?: string;
    wallet_address?: string | null;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
  };
};

type WalletNonceResponse = {
  wallet_address: string;
  nonce: string;
  message: string;
  expires_at: string;
};

function getStoredAuth(walletAddress: string): Level1AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Level1AuthSession;
    if (
      parsed.walletAddress !== walletAddress ||
      !parsed.accessToken ||
      !parsed.refreshToken
    ) {
      return null;
    }

    if (isJwtExpiredOrNearExpiry(parsed.accessToken)) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function storeAuth(session: Level1AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearBackendWalletAuth(walletAddress?: string) {
  if (typeof window === "undefined") return;

  if (!walletAddress) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  const stored = getStoredAuth(walletAddress);
  if (stored?.walletAddress === walletAddress) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function isBackendAuthError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  return /unauthorized|invalid token|missing bearer|not authenticated|401/i.test(
    message
  );
}

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

async function requestWalletNonce(walletAddress: string) {
  return backendRequest<WalletNonceResponse>("/api/v1/auth/wallet/nonce", {
    body: JSON.stringify({ wallet_address: walletAddress }),
    method: "POST",
  });
}

async function verifyWalletLogin({
  nonce,
  signature,
  walletAddress,
}: {
  nonce: string;
  signature: string;
  walletAddress: string;
}) {
  return backendRequest<AuthResponse>("/api/v1/auth/wallet/verify", {
    body: JSON.stringify({
      nonce,
      signature,
      wallet_address: walletAddress,
    }),
    method: "POST",
  });
}

export async function ensureBackendWalletAuth(
  wallet: WalletSession,
  options: { force?: boolean } = {}
) {
  const walletAddress = wallet.account.address;
  const stored = options.force ? null : getStoredAuth(walletAddress);
  if (stored) return stored;

  if (options.force) {
    clearBackendWalletAuth(walletAddress);
  }

  if (!wallet.signMessage) {
    throw new Error(
      "Connected wallet cannot sign authentication messages. Use a wallet with message signing support."
    );
  }

  const challenge = await requestWalletNonce(walletAddress);
  const messageBytes = new TextEncoder().encode(challenge.message);
  const signatureBytes = await wallet.signMessage(messageBytes);
  const signature = getBase58Decoder().decode(signatureBytes);
  const auth = await verifyWalletLogin({
    nonce: challenge.nonce,
    signature,
    walletAddress,
  });
  const session = {
    accessToken: auth.tokens.access_token,
    role: auth.user?.role,
    refreshToken: auth.tokens.refresh_token,
    walletAddress,
  };
  storeAuth(session);
  return session;
}

function isJwtExpiredOrNearExpiry(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const exp = typeof payload.exp === "number" ? payload.exp : undefined;
  if (!exp) return false;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowInSeconds + 30;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const payload = token.split(".")[1];
  if (!payload || typeof window === "undefined") return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    return JSON.parse(window.atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

export async function startLevel1(accessToken: string) {
  return backendRequest(`/api/v1/levels/${LEVEL_1_BACKEND_ID}/start`, {
    accessToken,
    method: "POST",
  });
}

export async function setupLevel1(accessToken: string, walletAddress: string) {
  return backendRequest<Level1SetupResponse>(
    `/api/v1/levels/${LEVEL_1_BACKEND_ID}/setup`,
    {
      accessToken,
      body: JSON.stringify({ wallet_address: walletAddress }),
      method: "POST",
    }
  );
}

export async function fetchLevel1BackendStatus(accessToken: string) {
  return backendRequest<Level1StatusResponse>(
    `/api/v1/levels/${LEVEL_1_BACKEND_ID}/status`,
    { accessToken }
  );
}

export async function submitLevel1Proof(
  accessToken: string,
  payload: {
    level_session_id: string;
    transaction_signature: string;
    wallet_address: string;
  }
) {
  console.info(`${LOG_PREFIX} backend submit start`, payload);

  const result = await backendRequest<Level1SubmitResponse>(
    `/api/v1/levels/${LEVEL_1_BACKEND_ID}/submit`,
    {
      accessToken,
      body: JSON.stringify(payload),
      method: "POST",
    }
  );

  if (!result.success) {
    throw new Error(
      result.error
        ? JSON.stringify(result.error)
        : "Level 1 verification failed."
    );
  }

  console.info(`${LOG_PREFIX} backend submit success`, result);
  return result;
}

function logLevel1Error(label: string, error: unknown) {
  console.error(`${LOG_PREFIX} ${label}`, error);
  if (error instanceof Error && error.stack) {
    console.error(`${LOG_PREFIX} ${label} stack`, error.stack);
  }
}

export async function executeLevel1ExploitTransaction({
  challenge,
  wallet,
}: {
  challenge: Level1Challenge;
  wallet: WalletSession;
}) {
  try {
    console.info(`${LOG_PREFIX} tx construction start`, {
      attacker_token_account: challenge.attacker_token_account,
      fake_vault: challenge.fake_vault,
      required_accounts: challenge.required_accounts,
      simulation: "zero-lamport system transfer",
      wallet: wallet.account.address,
    });

    const connection = new Connection(DEVNET_RPC_URL, "confirmed");
    const walletPublicKey = new PublicKey(wallet.account.address);
    const transaction = new Transaction();
    const requiredAccountKeys = Array.from(
      new Set(challenge.required_accounts ?? [])
    )
      .filter((account) => account !== wallet.account.address)
      .map((account) => ({
        isSigner: false,
        isWritable: false,
        pubkey: new PublicKey(account),
      }));

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

    console.info(`${LOG_PREFIX} instruction assembly success`, {
      instructionCount: transaction.instructions.length,
      requiredAccounts: requiredAccountKeys.map((key) => ({
        account: key.pubkey.toBase58(),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      simulation: "challenge accounts included as readonly non-signer metas",
      walletSigner: walletPublicKey.toBase58(),
    });

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
      console.warn(
        `${LOG_PREFIX} wallet lacks signTransaction; falling back to signAndSendTransaction. sendRawTransaction will be handled by wallet adapter.`
      );
      console.info(`${LOG_PREFIX} wallet sign request`, {
        method: "signAndSendTransaction",
        serializedBytes: serialized.length,
      });
      const signatureBytes = await sendTransaction(
        new Uint8Array(serialized),
        "solana:devnet"
      );
      console.info(`${LOG_PREFIX} wallet signature success`, {
        signatureBytes: signatureBytes.length,
      });
      const signature = getBase58Decoder().decode(signatureBytes);
      console.info(`${LOG_PREFIX} tx signature returned`, { signature });
      const confirmation = await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );
      console.info(`${LOG_PREFIX} confirmTransaction success`, confirmation);
      return signature;
    }

    if (!signTransaction) {
      throw new Error("Connected wallet cannot sign Solana transactions.");
    }

    console.info(`${LOG_PREFIX} wallet sign request`, {
      method: "signTransaction",
      serializedBytes: serialized.length,
    });
    const signed = await signTransaction(
      new Uint8Array(serialized),
      "solana:devnet"
    );
    console.info(`${LOG_PREFIX} wallet signature success`, {
      signedBytes: signed.length,
    });

    console.info(`${LOG_PREFIX} sendRawTransaction start`, {
      signedBytes: signed.length,
    });
    const signature = await connection.sendRawTransaction(signed, {
      skipPreflight: false,
    });
    console.info(`${LOG_PREFIX} tx signature returned`, { signature });

    const confirmation = await connection.confirmTransaction(
      { signature, ...latestBlockhash },
      "confirmed"
    );
    console.info(`${LOG_PREFIX} confirmTransaction success`, confirmation);
    return signature;
  } catch (error) {
    logLevel1Error("exploit transaction failed", error);
    throw error;
  }
}

export async function authorizeLevel1CertificateMint({
  wallet,
}: {
  wallet: WalletSession;
}) {
  try {
    console.info(`${LOG_PREFIX} certification authorization tx start`, {
      simulation: "one-lamport self transfer",
      wallet: wallet.account.address,
    });

    const connection = new Connection(DEVNET_RPC_URL, "confirmed");
    const walletPublicKey = new PublicKey(wallet.account.address);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        lamports: 1,
        toPubkey: walletPublicKey,
      })
    );

    console.info(`${LOG_PREFIX} certification instruction assembly success`, {
      instructionCount: transaction.instructions.length,
      walletSigner: walletPublicKey.toBase58(),
    });

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
      console.info(`${LOG_PREFIX} certification wallet sign request`, {
        method: "signAndSendTransaction",
        serializedBytes: serialized.length,
      });
      const signatureBytes = await sendTransaction(
        new Uint8Array(serialized),
        "solana:devnet"
      );
      console.info(`${LOG_PREFIX} certification wallet signature success`, {
        signatureBytes: signatureBytes.length,
      });
      const signature = getBase58Decoder().decode(signatureBytes);
      console.info(`${LOG_PREFIX} certification tx signature returned`, {
        signature,
      });
      const confirmation = await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );
      console.info(
        `${LOG_PREFIX} certification confirmTransaction success`,
        confirmation
      );
      return signature;
    }

    if (!signTransaction) {
      throw new Error("Connected wallet cannot sign Solana transactions.");
    }

    console.info(`${LOG_PREFIX} certification wallet sign request`, {
      method: "signTransaction",
      serializedBytes: serialized.length,
    });
    const signed = await signTransaction(
      new Uint8Array(serialized),
      "solana:devnet"
    );
    console.info(`${LOG_PREFIX} certification wallet signature success`, {
      signedBytes: signed.length,
    });

    console.info(`${LOG_PREFIX} certification sendRawTransaction start`, {
      signedBytes: signed.length,
    });
    const signature = await connection.sendRawTransaction(signed, {
      maxRetries: 3,
      skipPreflight: false,
    });
    console.info(`${LOG_PREFIX} certification tx signature returned`, {
      signature,
    });

    const confirmation = await connection.confirmTransaction(
      { signature, ...latestBlockhash },
      "confirmed"
    );
    console.info(
      `${LOG_PREFIX} certification confirmTransaction success`,
      confirmation
    );
    return signature;
  } catch (error) {
    logLevel1Error("certification authorization failed", error);
    throw error;
  }
}
