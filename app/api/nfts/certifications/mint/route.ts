import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import {
  mintCertificateAsset,
  type MintCertificateCluster,
} from "@/app/lib/nft/certification-server";

export const runtime = "nodejs";

type MintRequestBody = {
  cluster?: MintCertificateCluster;
  level?: number;
  merkleTree?: string;
  player?: string;
  rpcUrl?: string;
};

const CLUSTERS = new Set<MintCertificateCluster>([
  "devnet",
  "localnet",
  "mainnet-beta",
]);

function parseCluster(value: unknown): MintCertificateCluster {
  const cluster = (typeof value === "string" ? value : "devnet") as MintCertificateCluster;
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MintRequestBody;
    const result = await mintCertificateAsset({
      level: parseLevel(body.level),
      player: parsePublicKey(body.player, "Player"),
      cluster: parseCluster(body.cluster),
      baseUrl: request.nextUrl.origin,
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
      { status: 400 },
    );
  }
}
