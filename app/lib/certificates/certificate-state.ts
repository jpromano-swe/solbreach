import { address as toAddress, type Address } from "@solana/kit";
import { PublicKey as Web3PublicKey } from "@solana/web3.js";
import {
  VAULT_PROGRAM_ADDRESS,
  fetchMaybeLevelCertificate,
} from "../../generated/vault";
import { LEVEL_NUMBERS } from "../levels/course-status";

export type LevelCertificateSnapshot = {
  assetId: Address | null;
  certificatePda: Address;
  exists: boolean;
  leafIndex: number | null;
  leafNonce: bigint | null;
  level: 0 | 1 | 2 | 3;
  merkleTree: Address | null;
  minted: boolean;
};

export type CertificateCollection = Record<
  0 | 1 | 2 | 3,
  LevelCertificateSnapshot
>;

export function findCertificatePdaForUser(
  playerAddress: string,
  level: 0 | 1 | 2 | 3
): Address {
  const [pda] = Web3PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode("certificate"),
      new Web3PublicKey(playerAddress).toBuffer(),
      Uint8Array.of(level),
    ],
    new Web3PublicKey(VAULT_PROGRAM_ADDRESS)
  );

  return toAddress(pda.toBase58());
}

export async function fetchCertificateCollection({
  playerAddress,
  rpc,
}: {
  playerAddress: string;
  rpc: Parameters<typeof fetchMaybeLevelCertificate>[0];
}): Promise<CertificateCollection> {
  const snapshots = await Promise.all(
    LEVEL_NUMBERS.map(async (level) => {
      const certificatePda = findCertificatePdaForUser(playerAddress, level);
      const certificateAccount = await fetchMaybeLevelCertificate(
        rpc,
        certificatePda
      );

      return [
        level,
        {
          assetId: certificateAccount.exists
            ? certificateAccount.data.assetId
            : null,
          certificatePda,
          exists: certificateAccount.exists,
          leafIndex: certificateAccount.exists
            ? certificateAccount.data.leafIndex
            : null,
          leafNonce: certificateAccount.exists
            ? certificateAccount.data.leafNonce
            : null,
          level,
          merkleTree: certificateAccount.exists
            ? certificateAccount.data.merkleTree
            : null,
          minted: certificateAccount.exists
            ? certificateAccount.data.minted
            : false,
        } satisfies LevelCertificateSnapshot,
      ] as const;
    })
  );

  return Object.fromEntries(snapshots) as CertificateCollection;
}
