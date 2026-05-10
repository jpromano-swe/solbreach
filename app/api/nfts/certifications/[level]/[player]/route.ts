import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import {
  buildSolBreachCertificationMetadata,
  type SolBreachCluster,
  type SolBreachLevel,
} from "@/app/lib/nft/metadata";

const CLUSTERS = new Set<SolBreachCluster>(["devnet", "mainnet-beta", "localnet"]);

function parseLevel(value: string): SolBreachLevel {
  const parsed = Number(value);
  if (
    !Number.isInteger(parsed) ||
    parsed < 0 ||
    parsed > 3
  ) {
    throw new Error("Invalid level.");
  }
  return parsed as SolBreachLevel;
}

function parseCluster(value: string | null): SolBreachCluster {
  const cluster = (value ?? "devnet") as SolBreachCluster;
  if (!CLUSTERS.has(cluster)) {
    throw new Error("Invalid cluster.");
  }
  return cluster;
}

function assertPublicKey(value: string, label: string) {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error(`${label} is invalid.`);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ level: string; player: string }> },
) {
  try {
    const params = await context.params;
    const level = parseLevel(params.level);
    const hackerWallet = assertPublicKey(params.player, "Player");
    const cluster = parseCluster(request.nextUrl.searchParams.get("cluster"));
    const challengeProgramId = request.nextUrl.searchParams.get("challengeProgramId");
    const merkleTree = request.nextUrl.searchParams.get("merkleTree");
    const assetId = request.nextUrl.searchParams.get("assetId");
    const leafIndex = request.nextUrl.searchParams.get("leafIndex");
    const leafNonce = request.nextUrl.searchParams.get("leafNonce");
    const issuedAt = request.nextUrl.searchParams.get("issuedAt") ?? undefined;

    const metadata = buildSolBreachCertificationMetadata({
      level,
      hackerWallet,
      cluster,
      baseUrl: request.nextUrl.origin,
      challengeProgramId:
        challengeProgramId
          ? assertPublicKey(challengeProgramId, "Challenge program id")
          : undefined,
      merkleTree: merkleTree
        ? assertPublicKey(merkleTree, "Merkle tree")
        : undefined,
      assetId: assetId ? assertPublicKey(assetId, "Asset id") : undefined,
      leafIndex: leafIndex ? Number(leafIndex) : undefined,
      leafNonce: leafNonce ? Number(leafNonce) : undefined,
      issuedAt,
    });

    return NextResponse.json(metadata, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid certificate metadata request.",
      },
      { status: 400 },
    );
  }
}
