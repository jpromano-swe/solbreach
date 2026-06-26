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

export const LEVEL_3_BACKEND_ID = "e77c8525-c328-517b-b95f-4551c70a8834";

const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const LOG_PREFIX = "[SolBreach Level 3]";

export type Level3Challenge = {
  network: "devnet";
  level_session_id: string;
  wallet_address: string;
  program_id: string;
  guild_authority_pda: string;
  level3_state_pda: string;
  bounty_vault_pda: string;
  trusted_cpi_program: string;
  attacker_cpi_program: string;
  player_reward_account: string;
  authority_record_pda: string;
  required_accounts: string[];
  exploit_parameters?: {
    vulnerability?: string;
    mode?: string;
    demo_mode?: boolean;
    attack_goal?: string;
    expected_sequence?: string[];
    proof_fields?: string[];
    verification_focus?: string[];
  };
};

export type Level3SetupResponse = {
  level_id: string;
  level_session_id: string;
  exploit_status: string;
  challenge: Level3Challenge;
};

export type Level3StatusResponse = {
  level_id: string;
  state?: string;
  unlock_status?: string;
  completed: boolean;
  exploit_status?: string | null;
  level_session_id?: string | null;
  challenge_context?: Partial<Level3Challenge> | null;
  certification?: {
    slug?: string;
    title?: string;
    unlock_status?: string;
    mint_status?: string;
    metadata?: Record<string, unknown>;
  } | null;
};

export type Level3SubmitResponse = {
  success: boolean;
  data?: {
    submission_status?: string;
    level_completed?: boolean;
    xp_awarded?: number;
    next_level_unlocked?: boolean;
    unlocked_level_id?: string;
    certification?: {
      slug?: string;
      title?: string;
      unlock_status?: string;
      mint_status?: string;
      metadata?: Record<string, unknown>;
    };
  };
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  } | null;
};

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

export async function startLevel3(accessToken: string) {
  return backendRequest(`/api/v1/levels/${LEVEL_3_BACKEND_ID}/start`, {
    accessToken,
    method: "POST",
  });
}

export async function setupLevel3(accessToken: string, walletAddress: string) {
  return backendRequest<Level3SetupResponse>(
    `/api/v1/levels/${LEVEL_3_BACKEND_ID}/setup`,
    {
      accessToken,
      body: JSON.stringify({ wallet_address: walletAddress }),
      method: "POST",
    }
  );
}

export async function fetchLevel3BackendStatus(accessToken: string) {
  return backendRequest<Level3StatusResponse>(
    `/api/v1/levels/${LEVEL_3_BACKEND_ID}/status`,
    { accessToken }
  );
}

export async function submitLevel3Proof(
  accessToken: string,
  payload: {
    level_session_id: string;
    transaction_signature: string;
    wallet_address: string;
  }
) {
  console.info(`${LOG_PREFIX} backend submit start`, payload);

  const result = await backendRequest<Level3SubmitResponse>(
    `/api/v1/levels/${LEVEL_3_BACKEND_ID}/submit`,
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
        : "Level 3 verification failed."
    );
  }

  console.info(`${LOG_PREFIX} backend submit success`, result);
  return result;
}

function logLevel3Error(label: string, error: unknown) {
  console.error(`${LOG_PREFIX} ${label}`, error);
  if (error instanceof Error && error.stack) {
    console.error(`${LOG_PREFIX} ${label} stack`, error.stack);
  }
}

export async function executeLevel3ExploitTransaction({
  challenge,
  wallet,
}: {
  challenge: Level3Challenge;
  wallet: WalletSession;
}) {
  try {
    console.info(`${LOG_PREFIX} tx construction start`, {
      attacker_cpi_program: challenge.attacker_cpi_program,
      expected_sequence: challenge.exploit_parameters?.expected_sequence,
      guild_authority_pda: challenge.guild_authority_pda,
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
      simulation:
        "delegated-CPI challenge accounts included as readonly non-signer metas",
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
    logLevel3Error("exploit transaction failed", error);
    throw error;
  }
}
