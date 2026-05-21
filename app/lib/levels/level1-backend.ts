import { getBase58Decoder } from "@solana/kit";
import { createTransferInstruction } from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import type { WalletSession } from "../wallet/types";

export const SOLBREACH_BACKEND_URL = "https://api-solbreach.56.125.190.174.nip.io";
export const LEVEL_1_BACKEND_ID = "96d2111d-bb01-5a1b-9536-57331fed473e";

const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const AUTH_STORAGE_KEY = "solbreach.level1.backendAuth";
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export type Level1AuthSession = {
  accessToken: string;
  refreshToken: string;
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
  tokens: {
    access_token: string;
    refresh_token: string;
  };
};

function getStoredAuth(walletAddress: string): Level1AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Level1AuthSession;
    return parsed.walletAddress === walletAddress ? parsed : null;
  } catch {
    return null;
  }
}

function storeAuth(session: Level1AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function demoCredentials(walletAddress: string) {
  const normalized = walletAddress.toLowerCase();
  const suffix = normalized.slice(0, 16);

  return {
    email: `demo-${suffix}@solbreach.app`,
    password: "SolBreachDemo2026!",
    username: `demo_${normalized.slice(0, 12)}`,
  };
}

async function backendRequest<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("content-type") && options.body) {
    headers.set("content-type", "application/json");
  }

  if (options.accessToken) {
    headers.set("authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(`${SOLBREACH_BACKEND_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null
        ? body.error?.message || body.detail || response.statusText
        : response.statusText;
    throw new Error(message);
  }

  return body as T;
}

async function loginLevel1Demo(walletAddress: string) {
  const credentials = demoCredentials(walletAddress);
  const auth = await backendRequest<AuthResponse>("/api/v1/auth/login", {
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
    method: "POST",
  });

  const session = {
    accessToken: auth.tokens.access_token,
    refreshToken: auth.tokens.refresh_token,
    walletAddress,
  };
  storeAuth(session);
  return session;
}

export async function ensureLevel1DemoAuth(walletAddress: string) {
  const stored = getStoredAuth(walletAddress);
  if (stored) return stored;

  const credentials = demoCredentials(walletAddress);

  try {
    const auth = await backendRequest<AuthResponse>("/api/v1/auth/register", {
      body: JSON.stringify(credentials),
      method: "POST",
    });
    const session = {
      accessToken: auth.tokens.access_token,
      refreshToken: auth.tokens.refresh_token,
      walletAddress,
    };
    storeAuth(session);
    return session;
  } catch {
    return loginLevel1Demo(walletAddress);
  }
}

export async function startLevel1(accessToken: string) {
  return backendRequest(`/api/v1/levels/${LEVEL_1_BACKEND_ID}/start`, {
    accessToken,
    method: "POST",
  });
}

export async function setupLevel1(
  accessToken: string,
  walletAddress: string
) {
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
  const result = await backendRequest<Level1SubmitResponse>(
    `/api/v1/levels/${LEVEL_1_BACKEND_ID}/submit`,
    {
      accessToken,
      body: JSON.stringify(payload),
      method: "POST",
    }
  );

  if (!result.success) {
    throw new Error(result.error?.message ?? "Level 1 verification failed.");
  }

  return result;
}

export async function executeLevel1ExploitTransaction({
  challenge,
  wallet,
}: {
  challenge: Level1Challenge;
  wallet: WalletSession;
}) {
  const connection = new Connection(DEVNET_RPC_URL, "confirmed");
  const walletPublicKey = new PublicKey(wallet.account.address);
  const amount = BigInt(
    challenge.exploit_parameters?.expected_attacker_token_delta ?? 1000
  );
  const transaction = new Transaction();

  transaction.add(
    createTransferInstruction(
      new PublicKey(challenge.fake_vault),
      new PublicKey(challenge.attacker_token_account),
      walletPublicKey,
      amount
    )
  );

  const requiredAccountKeys = Array.from(
    new Set(challenge.required_accounts ?? [])
  ).map((account) => ({
    isSigner: false,
    isWritable: false,
    pubkey: new PublicKey(account),
  }));

  if (requiredAccountKeys.length > 0) {
    transaction.add(
      new TransactionInstruction({
        data: Buffer.from("solbreach:level1"),
        keys: requiredAccountKeys,
        programId: MEMO_PROGRAM_ID,
      })
    );
  }

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  transaction.feePayer = walletPublicKey;
  transaction.recentBlockhash = latestBlockhash.blockhash;

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  if (wallet.sendTransaction) {
    const signatureBytes = await wallet.sendTransaction(
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

  if (wallet.signTransaction) {
    const signed = await wallet.signTransaction(
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
  }

  throw new Error("Connected wallet cannot sign Solana transactions.");
}
