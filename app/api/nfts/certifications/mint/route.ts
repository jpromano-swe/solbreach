import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import {
  mintCertificateAsset,
  type MintCertificateCluster,
} from "@/app/lib/nft/certification-server";
import { applyNgrokBypassHeader } from "@/app/lib/backend/ngrok";

export const runtime = "nodejs";

const SOLBREACH_BACKEND_URL =
  process.env.SOLBREACH_BACKEND_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

if (!SOLBREACH_BACKEND_URL) {
  throw new Error(
    "SOLBREACH_BACKEND_URL or NEXT_PUBLIC_API_BASE_URL must be configured."
  );
}
const LEVEL_1_BACKEND_ID = "96d2111d-bb01-5a1b-9536-57331fed473e";

type MintRequestBody = {
  backendAccessToken?: string;
  cluster?: MintCertificateCluster;
  level?: number;
  merkleTree?: string;
  mintAuthorizationSignature?: string;
  player?: string;
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
  if (typeof accessToken !== "string" || !accessToken.trim()) {
    return {
      completed: false,
      reason: "Level 1 backend session token is missing.",
    };
  }

  const headers = new Headers({
    authorization: `Bearer ${accessToken}`,
  });
  applyNgrokBypassHeader(headers, SOLBREACH_BACKEND_URL);

  const response = await fetch(
    `${SOLBREACH_BACKEND_URL}/api/v1/levels/${LEVEL_1_BACKEND_ID}/status`,
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MintRequestBody;
    const level = parseLevel(body.level);
    const backendLevel1 =
      level === 1
        ? await canMintBackendLevel1Certificate(body.backendAccessToken)
        : { completed: false, reason: null };
    const allowMissingCertificate = level === 1 && backendLevel1.completed;

    if (level === 1 && body.backendAccessToken && !backendLevel1.completed) {
      throw new Error(
        backendLevel1.reason ??
          "Level 1 backend completion could not be verified."
      );
    }

    if (allowMissingCertificate) {
      parseSignature(
        body.mintAuthorizationSignature,
        "Level 1 mint authorization signature"
      );
    }

    const result = await mintCertificateAsset({
      allowMissingCertificate,
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
