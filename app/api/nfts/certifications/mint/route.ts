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

  return backendUrl;
}

const LEVEL_1_BACKEND_ID = "96d2111d-bb01-5a1b-9536-57331fed473e";

type MintRequestBody = {
  backendAccessToken?: string;
  cluster?: MintCertificateCluster;
  level?: number;
  merkleTree?: string;
  mintAuthorizationSignature?: string;
  player?: string;
  researchLabAccessToken?: string;
  researchLabSessionId?: string;
  rpcUrl?: string;
};

const CLUSTERS = new Set<MintCertificateCluster>([
  "devnet",
  "localnet",
  "mainnet-beta",
]);

function parseCluster(value: unknown): MintCertificateCluster {
  const cluster = (
    typeof value === "string" ? value : "devnet"
  ) as MintCertificateCluster;
  if (!CLUSTERS.has(cluster)) {
    throw new Error("Cluster must be devnet, localnet, or mainnet-beta.");
  }
  return cluster;
}

function parseLevel(value: unknown) {
  const level = Number(value);
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

function parseSignature(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  const signature = value.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) {
    throw new Error(`${label} is invalid.`);
  }

  return signature;
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

async function canMintResearchLabLevel1Certificate({
  accessToken,
  sessionId,
}: {
  accessToken: unknown;
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
    { headers }
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
  const sessionStatus =
    typeof session?.status === "string" ? session.status : null;
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
      : "Research Lab 1 completion is not ready for certification minting.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MintRequestBody;
    const level = parseLevel(body.level);
    const backendLevel1 =
      level === 1
        ? await canMintBackendLevel1Certificate(body.backendAccessToken)
        : { completed: false, reason: null };
    const researchLabLevel1 =
      level === 1 && !backendLevel1.completed
        ? await canMintResearchLabLevel1Certificate({
            accessToken: body.researchLabAccessToken,
            sessionId: body.researchLabSessionId,
          })
        : { completed: false, reason: null };
    const level1CompletionVerified =
      backendLevel1.completed || researchLabLevel1.completed;

    if (
      level === 1 &&
      (body.backendAccessToken ||
        body.researchLabAccessToken ||
        body.researchLabSessionId) &&
      !level1CompletionVerified
    ) {
      throw new Error(
        backendLevel1.reason ??
          researchLabLevel1.reason ??
          "Level 1 backend completion could not be verified."
      );
    }

    if (level1CompletionVerified) {
      parseSignature(
        body.mintAuthorizationSignature,
        "Level 1 mint authorization signature"
      );
    }

    const result = await mintCertificateAsset({
      allowMissingCertificate: level === 1 && level1CompletionVerified,
      level,
      player: parsePublicKey(body.player, "Player"),
      cluster: parseCluster(body.cluster),
      baseUrl: publicBaseUrl(request),
      merkleTree:
        typeof body.merkleTree === "string" && body.merkleTree.trim()
          ? parsePublicKey(body.merkleTree, "Merkle tree")
          : undefined,
      rpcUrl:
        typeof body.rpcUrl === "string" && body.rpcUrl.trim()
          ? body.rpcUrl
          : undefined,
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
