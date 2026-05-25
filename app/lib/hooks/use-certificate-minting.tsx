"use client";

import { useCallback, useState } from "react";
import { type Address, type Instruction } from "@solana/kit";
import { toast } from "sonner";
import {
  findCertificatePdaForUser,
  type LevelCertificateSnapshot,
} from "../certificates/certificate-state";
import { getClusterUrl, type ClusterMoniker } from "../solana-client";
import { authorizeLevel1CertificateMint } from "../levels/level1-backend";
import type { LevelId } from "../levels/course-status";
import type { WalletSession } from "../wallet/types";
import { getClaimLevelCertificateInstructionAsync } from "../../generated/vault";

type MintPayload =
  | {
      error?: string;
    }
  | {
      alreadyMinted: boolean;
      assetId: string;
      certificatePda: string;
      leafIndex: number;
      leafNonce: string;
      merkleTree: string;
      mintSignature?: string;
      recordSignature?: string;
    };

type SendInstruction = (input: {
  instructions: Instruction[];
}) => Promise<string>;
type CertificateSigner = Parameters<
  typeof getClaimLevelCertificateInstructionAsync
>[0]["user"];

export function useCertificateMinting({
  address,
  cluster,
  getExplorerUrl,
  onLevel1BackendCertificateMinted,
  refreshState,
  send,
  signer,
  wallet,
}: {
  address?: Address;
  cluster: ClusterMoniker;
  getExplorerUrl: (path: string) => string;
  onLevel1BackendCertificateMinted?: (payload: {
    assetId: string;
    certificatePda: string;
    leafIndex: number | null;
    leafNonce: string | null;
    merkleTree: string | null;
  }) => void;
  refreshState: () => Promise<void>;
  send: SendInstruction;
  signer?: CertificateSigner | null;
  wallet?: WalletSession | null;
}) {
  const [mintingLevel, setMintingLevel] = useState<LevelId | null>(null);

  const mintLevelCertificate = useCallback(
    async ({
      backendAccessToken,
      level,
      levelId,
      existingCertificate,
      title,
    }: {
      backendAccessToken?: string;
      level: 0 | 1 | 2 | 3;
      levelId: LevelId;
      existingCertificate?: LevelCertificateSnapshot;
      title: string;
    }) => {
      if (!signer || !address) {
        toast.error("Connect the wallet that cleared this level first.");
        return;
      }

      if (cluster === "testnet") {
        toast.error(
          "Certificate minting is only configured for devnet, localnet, or mainnet-beta."
        );
        return;
      }

      if (existingCertificate?.minted) {
        toast.success(`${title} cNFT already minted.`, {
          description: existingCertificate.assetId ? (
            <a
              href={getExplorerUrl(`/address/${existingCertificate.assetId}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              View recorded asset
            </a>
          ) : (
            "The certificate PDA already has a recorded compressed asset."
          ),
        });
        return;
      }

      setMintingLevel(levelId);

      try {
        const canMintFromBackendCompletion =
          level === 1 && Boolean(backendAccessToken);
        let mintAuthorizationSignature: string | undefined;

        if (!existingCertificate?.exists && !canMintFromBackendCompletion) {
          const claimInstruction =
            await getClaimLevelCertificateInstructionAsync({
              user: signer,
              certificate: findCertificatePdaForUser(address, level),
              level,
            });

          const claimSignature = await send({
            instructions: [claimInstruction],
          });
          toast.success(`${title} certificate claimed.`, {
            description: (
              <a
                href={getExplorerUrl(`/tx/${claimSignature}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                View claim transaction
              </a>
            ),
          });
        } else if (canMintFromBackendCompletion) {
          if (!wallet) {
            throw new Error(
              "Connect your wallet before minting the Level 1 certification."
            );
          }

          mintAuthorizationSignature = await authorizeLevel1CertificateMint({
            wallet,
          });

          toast.success(`${title} certification authorized.`, {
            description: (
              <a
                href={getExplorerUrl(`/tx/${mintAuthorizationSignature}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                View wallet authorization transaction
              </a>
            ),
          });
        }

        const response = await fetch("/api/nfts/certifications/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            backendAccessToken,
            cluster: cluster === "mainnet" ? "mainnet-beta" : cluster,
            level,
            mintAuthorizationSignature,
            player: address,
            rpcUrl: getClusterUrl(cluster),
          }),
        });

        const payload = (await response.json()) as MintPayload;

        if (!response.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Mint route failed."
          );
        }

        await refreshState();

        const assetId = "assetId" in payload ? payload.assetId : undefined;
        const mintSignature =
          "mintSignature" in payload ? payload.mintSignature : undefined;
        const alreadyMinted =
          "alreadyMinted" in payload ? payload.alreadyMinted : false;

        if (
          level === 1 &&
          backendAccessToken &&
          "assetId" in payload &&
          "certificatePda" in payload
        ) {
          onLevel1BackendCertificateMinted?.({
            assetId: payload.assetId,
            certificatePda: payload.certificatePda,
            leafIndex: payload.leafIndex ?? null,
            leafNonce: payload.leafNonce ?? null,
            merkleTree: payload.merkleTree ?? null,
          });
        }

        toast.success(
          alreadyMinted
            ? `${title} cNFT already existed.`
            : `${title} cNFT minted.`,
          {
            description: assetId ? (
              <a
                href={getExplorerUrl(`/address/${assetId}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {mintSignature
                  ? "View compressed asset record"
                  : "View recorded asset"}
              </a>
            ) : undefined,
          }
        );
      } catch (err) {
        console.error("Certificate mint failed:", err);
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setMintingLevel(null);
      }
    },
    [
      address,
      cluster,
      getExplorerUrl,
      onLevel1BackendCertificateMinted,
      refreshState,
      send,
      signer,
      wallet,
    ]
  );

  return { mintingLevel, mintLevelCertificate };
}
