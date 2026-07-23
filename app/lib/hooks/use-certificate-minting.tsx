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
      leafIndex: number | null;
      leafNonce: string | null;
      merkleTree: string | null;
      mintSignature?: string;
      recordSignature?: string;
    };

type SendInstruction = (input: {
  instructions: Instruction[];
}) => Promise<string>;
type CertificateSigner = Parameters<
  typeof getClaimLevelCertificateInstructionAsync
>[0]["user"];
export type Level1ResearchLabMintAuthorization = {
  certificateLevel?: 1 | 2 | 3;
  researchLabAccessToken?: string;
  researchLabSessionId?: string;
};

export function useCertificateMinting({
  address,
  certificates,
  cluster,
  ensureLevel1BackendSession,
  getExplorerUrl,
  level1BackendCompleted,
  onResearchLabCertificateMinted,
  refreshState,
  send,
  signer,
  wallet,
}: {
  address?: Address;
  certificates: {
    level0Certificate?: LevelCertificateSnapshot;
    level1Certificate?: LevelCertificateSnapshot;
    level2Certificate?: LevelCertificateSnapshot;
    level3Certificate?: LevelCertificateSnapshot;
  };
  cluster: ClusterMoniker;
  ensureLevel1BackendSession: () => Promise<{ accessToken: string } | null>;
  getExplorerUrl: (path: string) => string;
  level1BackendCompleted: boolean;
  onResearchLabCertificateMinted?: (payload: {
    assetId: string;
    certificatePda: string;
    level: 1 | 2 | 3;
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
      researchLabAccessToken,
      researchLabSessionId,
      title,
    }: {
      backendAccessToken?: string;
      level: 0 | 1 | 2 | 3;
      levelId: LevelId;
      existingCertificate?: LevelCertificateSnapshot;
      researchLabAccessToken?: string;
      researchLabSessionId?: string;
      title: string;
    }) => {
      if (!signer || !address) {
        toast.error("Connect the wallet that cleared this level first.");
        return null;
      }

      if (cluster === "testnet") {
        toast.error(
          "Certificate minting is only configured for devnet, localnet, or mainnet-beta."
        );
        return null;
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
        return existingCertificate.assetId
          ? {
              alreadyMinted: true,
              assetId: String(existingCertificate.assetId),
              certificatePda: String(existingCertificate.certificatePda),
              leafIndex: existingCertificate.leafIndex,
              leafNonce: existingCertificate.leafNonce?.toString() ?? null,
              merkleTree: existingCertificate.merkleTree
                ? String(existingCertificate.merkleTree)
                : null,
            }
          : null;
      }

      setMintingLevel(levelId);

      try {
        const canMintFromBackendLevelCompletion =
          level === 1 &&
          Boolean(backendAccessToken);
        const canMintFromResearchLabCompletion = Boolean(
          researchLabAccessToken && researchLabSessionId
        );
        const canMintFromBackendCompletion =
          canMintFromBackendLevelCompletion ||
          canMintFromResearchLabCompletion;
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
              "Connect your wallet before minting this certification."
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
            researchLabAccessToken,
            researchLabSessionId,
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
          canMintFromBackendCompletion &&
          "assetId" in payload &&
          "certificatePda" in payload
        ) {
          onResearchLabCertificateMinted?.({
            assetId: payload.assetId,
            certificatePda: payload.certificatePda,
            level: level as 1 | 2 | 3,
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
        return "assetId" in payload ? payload : null;
      } catch (err) {
        console.error("Certificate mint failed:", err);
        toast.error(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setMintingLevel(null);
      }
    },
    [
      address,
      cluster,
      getExplorerUrl,
      onResearchLabCertificateMinted,
      refreshState,
      send,
      signer,
      wallet,
    ]
  );

  const mintLevel0 = useCallback(async () => {
    return mintLevelCertificate({
      level: 0,
      levelId: "level0",
      existingCertificate: certificates.level0Certificate,
      title: "Hello SolBreach",
    });
  }, [certificates.level0Certificate, mintLevelCertificate]);

  const mintLevel1 = useCallback(async (
    options?: Level1ResearchLabMintAuthorization
  ) => {
    const auth = level1BackendCompleted
      ? await ensureLevel1BackendSession()
      : null;

    return mintLevelCertificate({
      backendAccessToken: level1BackendCompleted
        ? auth?.accessToken
        : undefined,
      level: 1,
      levelId: "level1",
      existingCertificate: certificates.level1Certificate,
      researchLabAccessToken: options?.researchLabAccessToken,
      researchLabSessionId: options?.researchLabSessionId,
      title: "Level 1",
    });
  }, [
    certificates.level1Certificate,
    ensureLevel1BackendSession,
    level1BackendCompleted,
    mintLevelCertificate,
  ]);

  const mintLevel2 = useCallback(async () => {
    return mintLevelCertificate({
      level: 2,
      levelId: "level2",
      existingCertificate: certificates.level2Certificate,
      title: "Level 2",
    });
  }, [certificates.level2Certificate, mintLevelCertificate]);

  const mintResearchLabLevel2 = useCallback(async (
    options?: Level1ResearchLabMintAuthorization
  ) => {
    return mintLevelCertificate({
      level: 2,
      levelId: "level2",
      existingCertificate: certificates.level2Certificate,
      researchLabAccessToken: options?.researchLabAccessToken,
      researchLabSessionId: options?.researchLabSessionId,
      title: "Level 2",
    });
  }, [certificates.level2Certificate, mintLevelCertificate]);

  const mintLevel3 = useCallback(async () => {
    return mintLevelCertificate({
      level: 3,
      levelId: "level3",
      existingCertificate: certificates.level3Certificate,
      title: "Level 3",
    });
  }, [certificates.level3Certificate, mintLevelCertificate]);

  const mintResearchLabLevel3 = useCallback(async (
    options?: Level1ResearchLabMintAuthorization
  ) => {
    return mintLevelCertificate({
      level: 3,
      levelId: "level3",
      existingCertificate: certificates.level3Certificate,
      researchLabAccessToken: options?.researchLabAccessToken,
      researchLabSessionId: options?.researchLabSessionId,
      title: "Level 3",
    });
  }, [certificates.level3Certificate, mintLevelCertificate]);

  return {
    mintingLevel,
    mintLevel0,
    mintLevel1,
    mintLevel2,
    mintResearchLabLevel2,
    mintLevel3,
    mintResearchLabLevel3,
  };
}
