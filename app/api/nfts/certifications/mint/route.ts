import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import {
  mintCertificateAsset,
  type MintCertificateCluster,
} from "@/app/lib/nft/certification-server";
import { applyNgrokBypassHeader } from "@/app/lib/backend/ngrok";

export const runtime = "nodejs";

function getSolbreachBackendUrl() {
  const backendUrl =
    process.env.SOLBREACH_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!backendUrl) {
    throw new Error(
      "SOLBREACH_BACKEND_URL or NEXT_PUBLIC_API_BASE_URL must be configured."
    );
  }

  return backendUrl.replace(/\/+$/, "");
}

const LEVEL_1_BACKEND_ID = "96d2111d-bb01-5a1b-9536-57331fed473e";

type MintRequestBody = {
  cluster?: MintCertificateCluster;
  level?: number;
  merkleTree?: string;
  mintAuthorizationSignature?: string;
  mintAuthorizationIssuedAt?: number;
  mintAuthorizationNonce?: string;
  player?: string;
  researchLabSessionId?: string;
  rpcUrl?: string;
};

const RESEARCH_LAB_CERTIFICATE_LEVELS: Record<string, number> = {
  "rl1-account-substitution": 1,
  "rl2-yield-hijack": 2,
  "rl3-arbitrary-cpi": 3,
};

function parseCluster(value: unknown): MintCertificateCluster {
  if (value !== "devnet")
    throw new Error("Certificate minting is only available on devnet.");
  return "devnet";
}

function parseLevel(value: unknown) {
  const level = typeof value === "number" ? value : NaN;
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw new Error("Level must be an integer from 0 to 3.");
  }
  return level;
}

function parsePublicKey(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error(`${label} is invalid.`);
  }
}

function publicBaseUrl(request: NextRequest) {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim() ||
    request.nextUrl.origin
  ).replace(/\/$/, "");
}

async function canMintBackendLevel1Certificate(accessToken: unknown) {
  const backendUrl = getSolbreachBackendUrl();

  if (typeof accessToken !== "string" || !accessToken.trim()) {
    return {
      completed: false,
      reason: "Level 1 backend session token is missing.",
    };
  }

  const headers = new Headers({
    authorization: `Bearer ${accessToken}`,
  });
  applyNgrokBypassHeader(headers, backendUrl);

  const response = await fetch(
    `${backendUrl}/api/v1/levels/${LEVEL_1_BACKEND_ID}/status`,
    {
      headers,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return {
      completed: false,
      reason: `Level 1 backend status check failed with ${response.status}.`,
    };
  }

  const status = (await response.json()) as { completed?: boolean };
  return {
    completed: Boolean(status.completed),
    reason: status.completed
      ? null
      : "Level 1 backend verification is not complete for this session.",
  };
}

async function canMintResearchLabCertificate({
  accessToken,
  level,
  sessionId,
}: {
  accessToken: unknown;
  level: number;
  sessionId: unknown;
}) {
  const backendUrl = getSolbreachBackendUrl();

  if (typeof accessToken !== "string" || !accessToken.trim()) {
    return {
      completed: false,
      reason: "Research Lab session token is missing.",
    };
  }

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return {
      completed: false,
      reason: "Research Lab session id is missing.",
    };
  }

  const headers = new Headers({
    authorization: `Bearer ${accessToken}`,
  });
  applyNgrokBypassHeader(headers, backendUrl);

  const response = await fetch(
    `${backendUrl}/api/v1/research-labs/sessions/${encodeURIComponent(
      sessionId
    )}`,
    { headers, cache: "no-store" }
  );

  if (!response.ok) {
    return {
      completed: false,
      reason: `Research Lab session check failed with ${response.status}.`,
    };
  }

  const payload = (await response.json()) as {
    success?: boolean;
    data?: Record<string, unknown>;
  } & Record<string, unknown>;
  const session =
    payload && typeof payload === "object" && "data" in payload
      ? payload.data
      : payload;
  const reportStatus =
    typeof session?.report_status === "string"
      ? session.report_status
      : typeof session?.reportStatus === "string"
        ? session.reportStatus
        : null;
  const labId =
    typeof session?.lab_id === "string"
      ? session.lab_id
      : typeof session?.labId === "string"
        ? session.labId
        : null;
  const sessionStatus =
    typeof session?.status === "string" ? session.status : null;
  const expectedLevel = labId
    ? RESEARCH_LAB_CERTIFICATE_LEVELS[labId]
    : undefined;
  if (expectedLevel !== level) {
    return {
      completed: false,
      reason: labId
        ? `Research Lab ${labId} cannot mint Level ${level} certification.`
        : "Research Lab session did not include a lab id.",
    };
  }

  const completed = Boolean(
    session?.lab_completed ||
    session?.labCompleted ||
    session?.certificate_unlockable ||
    session?.certificateUnlockable ||
    reportStatus === "accepted" ||
    sessionStatus === "passed"
  );

  return {
    completed,
    reason: completed
      ? null
      : "Research Lab completion is not ready for certification minting.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MintRequestBody;
    const level = parseLevel(body.level);
    const cluster = parseCluster(body.cluster);
    const player = parsePublicKey(body.player, "Player");
    const accessToken = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    if (!accessToken?.trim()) {
      return NextResponse.json(
        { error: "A backend session is required for every certificate level." },
        { status: 401 }
      );
    }
    const backendUrl = getSolbreachBackendUrl();
    const headers = new Headers({
      authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    });
    applyNgrokBypassHeader(headers, backendUrl);
    // The backend verifies Ed25519 ownership, expiry, nonce replay and a durable
    // per-wallet rate limit before any server authority can be used.
    const authorization = await fetch(
      `${backendUrl}/api/v1/certificates/mint-authorization`,
      {
        method: "POST",
        headers,
        cache: "no-store",
        body: JSON.stringify({
          player,
          level,
          cluster,
          signature: body.mintAuthorizationSignature,
          issued_at: body.mintAuthorizationIssuedAt,
          nonce: body.mintAuthorizationNonce,
        }),
      }
    );
    if (!authorization.ok) {
      return NextResponse.json(
        {
          error:
            authorization.status === 429
              ? "Too many certificate mint attempts. Try again in ten minutes."
              : "Wallet mint authorization was rejected. Sign a fresh request with the session wallet.",
        },
        { status: authorization.status >= 500 ? 503 : authorization.status }
      );
    }
    const authorized = await authorization.json();
    if (
      authorized.authorized !== true ||
      authorized.wallet_address !== player ||
      authorized.level !== level
    ) {
      throw new Error("Backend returned an invalid mint authorization.");
    }
    const backendLevel1 =
      level === 1
        ? await canMintBackendLevel1Certificate(accessToken)
        : { completed: false };
    const researchLabCompletion =
      !backendLevel1.completed && body.researchLabSessionId
        ? await canMintResearchLabCertificate({
            accessToken,
            level,
            sessionId: body.researchLabSessionId,
          })
        : { completed: false };
    const result = await mintCertificateAsset({
      allowMissingCertificate:
        backendLevel1.completed || researchLabCompletion.completed,
      level,
      player,
      cluster,
      baseUrl: publicBaseUrl(request),
      // RPC and Merkle tree are exclusively server configuration.
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to mint SolBreach certificate cNFT.",
      },
      { status: 400 }
    );
  }
}
