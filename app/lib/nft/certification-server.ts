import crypto from "node:crypto";

import {
  fetchTreeConfigFromSeeds,
  findLeafAssetIdPda,
  mintV1,
  mplBubblegum,
} from "@metaplex-foundation/mpl-bubblegum";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import { VAULT_PROGRAM_ADDRESS } from "@/app/generated/vault";

export type MintCertificateCluster = "devnet" | "localnet" | "mainnet-beta";

type ParsedCertificate = {
  assetId: PublicKey;
  leafIndex: number;
  leafNonce: bigint;
  merkleTree: PublicKey;
  minted: boolean;
};

export type MintCertificateResult = {
  alreadyMinted: boolean;
  assetId: string;
  certificatePda: string;
  leafIndex: number;
  leafNonce: string;
  merkleTree: string;
  mintSignature?: string;
  recordSignature?: string;
};

const DEFAULT_RPC_URL = "https://api.devnet.solana.com";
const CERTIFICATE_ACCOUNT_MIN_SIZE = 136;

function loadAuthorityKeypair() {
  const inlineSecret = process.env.ADMIN_PRIVATE_KEY?.trim();
  if (inlineSecret) {
    if (inlineSecret.startsWith("[")) {
      return Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(inlineSecret) as number[]),
      );
    }
  }

  throw new Error(
    "ADMIN_PRIVATE_KEY is required for UI cNFT minting. Set it to a JSON array secret key in .env.local.",
  );
}

function rpcUrlFromInput(rpcUrl?: string) {
  return (
    rpcUrl ??
    process.env.SOLANA_RPC_URL ??
    process.env.RPC_URL ??
    DEFAULT_RPC_URL
  );
}

function vaultProgramId() {
  return new PublicKey(
    process.env.VAULT_PROGRAM_ID?.trim() || VAULT_PROGRAM_ADDRESS,
  );
}

function merkleTreeFromInput(merkleTree?: string) {
  const value = merkleTree ?? process.env.MERKLE_TREE_ADDRESS?.trim();
  if (!value) {
    throw new Error(
      "Merkle tree address is missing. Set MERKLE_TREE_ADDRESS or provide merkleTree in the request.",
    );
  }
  return new PublicKey(value);
}

function discriminator(name: string) {
  return crypto
    .createHash("sha256")
    .update(`global:${name}`)
    .digest()
    .subarray(0, 8);
}

function encodePubkey(publicKey: PublicKey) {
  return Buffer.from(publicKey.toBytes());
}

function encodeU32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

function encodeU64(value: bigint) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

function findCertificationAuthorityPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("certification_authority")],
    programId,
  );
}

function findCertificatePda(programId: PublicKey, player: PublicKey, level: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("certificate"), player.toBuffer(), Buffer.from([level])],
    programId,
  );
}

function buildInitCertificationAuthorityInstruction({
  admin,
  authority,
  certificationAuthority,
  programId,
}: {
  admin: PublicKey;
  authority: PublicKey;
  certificationAuthority: PublicKey;
  programId: PublicKey;
}) {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: certificationAuthority, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      discriminator("init_certification_authority"),
      encodePubkey(authority),
    ]),
  });
}

function buildRecordCertificateAssetInstruction({
  authority,
  certificationAuthority,
  certificate,
  merkleTree,
  assetId,
  leafIndex,
  leafNonce,
  programId,
}: {
  authority: PublicKey;
  certificationAuthority: PublicKey;
  certificate: PublicKey;
  merkleTree: PublicKey;
  assetId: PublicKey;
  leafIndex: number;
  leafNonce: bigint;
  programId: PublicKey;
}) {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: certificationAuthority, isSigner: false, isWritable: false },
      { pubkey: certificate, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([
      discriminator("record_certificate_asset"),
      encodePubkey(merkleTree),
      encodePubkey(assetId),
      encodeU32(leafIndex),
      encodeU64(leafNonce),
    ]),
  });
}

async function sendInstruction(
  connection: Connection,
  signer: Keypair,
  instruction: TransactionInstruction,
) {
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: signer.publicKey,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(instruction);

  return sendAndConfirmTransaction(connection, transaction, [signer], {
    commitment: "confirmed",
  });
}

function parseCertificationAuthorityAccount(data: Buffer) {
  if (data.length < 41) {
    throw new Error("Certification authority account data is too short.");
  }

  let offset = 8;
  const authority = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const bump = data.readUInt8(offset);
  return { authority, bump };
}

function parseLevelCertificateAccount(data: Buffer): ParsedCertificate {
  if (data.length < CERTIFICATE_ACCOUNT_MIN_SIZE) {
    throw new Error("LevelCertificate account data is missing or too short.");
  }

  let offset = 8;
  offset += 32; // player
  const merkleTree = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const assetId = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  offset += 1; // level
  const leafIndex = data.readUInt32LE(offset);
  offset += 4;
  const leafNonce = data.readBigUInt64LE(offset);
  offset += 8;
  const minted = data.readUInt8(offset) === 1;

  return {
    assetId,
    leafIndex,
    leafNonce,
    merkleTree,
    minted,
  };
}

async function ensureCertificationAuthority(
  connection: Connection,
  signer: Keypair,
  programId: PublicKey,
) {
  const [certificationAuthorityPda] = findCertificationAuthorityPda(programId);
  const authorityAccount = await connection.getAccountInfo(
    certificationAuthorityPda,
    "confirmed",
  );

  if (authorityAccount) {
    const { authority } = parseCertificationAuthorityAccount(authorityAccount.data);
    if (!authority.equals(signer.publicKey)) {
      throw new Error(
        `Certification authority PDA is bound to ${authority.toBase58()}, not the configured signer ${signer.publicKey.toBase58()}.`,
      );
    }

    return certificationAuthorityPda;
  }

  const initInstruction = buildInitCertificationAuthorityInstruction({
    admin: signer.publicKey,
    authority: signer.publicKey,
    certificationAuthority: certificationAuthorityPda,
    programId,
  });
  await sendInstruction(connection, signer, initInstruction);

  return certificationAuthorityPda;
}

function metadataUri({
  baseUrl,
  cluster,
  level,
  player,
}: {
  baseUrl: string;
  cluster: MintCertificateCluster;
  level: number;
  player: PublicKey;
}) {
  const url = new URL(
    `/api/nfts/certifications/${level}/${player.toBase58()}`,
    `${baseUrl}/`,
  );
  if (cluster !== "devnet") {
    url.searchParams.set("cluster", cluster);
  }
  return url.toString();
}

export async function mintCertificateAsset(params: {
  level: number;
  player: string;
  cluster: MintCertificateCluster;
  baseUrl: string;
  merkleTree?: string;
  rpcUrl?: string;
}) {
  const level = params.level;
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw new Error("Level must be an integer from 0 to 3.");
  }

  const player = new PublicKey(params.player);
  const programId = vaultProgramId();
  const merkleTree = merkleTreeFromInput(params.merkleTree);
  const rpcUrl = rpcUrlFromInput(params.rpcUrl);
  const signer = loadAuthorityKeypair();
  const connection = new Connection(rpcUrl, "confirmed");

  const [certificatePda] = findCertificatePda(programId, player, level);
  const certificateAccount = await connection.getAccountInfo(
    certificatePda,
    "confirmed",
  );
  if (!certificateAccount) {
    throw new Error(
      `Certificate PDA ${certificatePda.toBase58()} does not exist. Claim the certificate first.`,
    );
  }

  const certificate = parseLevelCertificateAccount(certificateAccount.data);
  if (certificate.minted) {
    return {
      alreadyMinted: true,
      assetId: certificate.assetId.toBase58(),
      certificatePda: certificatePda.toBase58(),
      leafIndex: certificate.leafIndex,
      leafNonce: certificate.leafNonce.toString(),
      merkleTree: certificate.merkleTree.toBase58(),
    } satisfies MintCertificateResult;
  }

  const certificationAuthorityPda = await ensureCertificationAuthority(
    connection,
    signer,
    programId,
  );

  const umi = createUmi(rpcUrl).use(mplBubblegum());
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(signer.secretKey);
  umi.use(keypairIdentity(umiKeypair));

  const treeConfig = await fetchTreeConfigFromSeeds(
    umi,
    { merkleTree: publicKey(merkleTree.toBase58()) },
    { commitment: "confirmed" },
  );
  const nextLeafIndex = Number(treeConfig.numMinted);
  const predictedAssetId = findLeafAssetIdPda(umi, {
    merkleTree: publicKey(merkleTree.toBase58()),
    leafIndex: nextLeafIndex,
  })[0];
  const predictedAssetKey = new PublicKey(predictedAssetId.toString());

  const uri = metadataUri({
    baseUrl: params.baseUrl,
    cluster: params.cluster,
    level,
    player,
  });

  const builder = mintV1(umi, {
    leafOwner: publicKey(player.toBase58()),
    leafDelegate: publicKey(player.toBase58()),
    merkleTree: publicKey(merkleTree.toBase58()),
    metadata: {
      name: `SolBreach Level ${level} Certification`,
      symbol: "SBREACH",
      uri,
      sellerFeeBasisPoints: 0,
      primarySaleHappened: false,
      isMutable: false,
      collection: null,
      creators: [
        {
          address: umi.identity.publicKey,
          verified: false,
          share: 100,
        },
      ],
    },
  });

  const { result } = await builder.sendAndConfirm(umi, {
    confirm: { commitment: "confirmed" },
    send: { preflightCommitment: "confirmed", skipPreflight: false },
  });

  if (result.value.err) {
    throw new Error(`cNFT mint failed: ${JSON.stringify(result.value.err)}`);
  }

  const assetId = predictedAssetKey;
  const leafNonce = BigInt(nextLeafIndex);

  const recordInstruction = buildRecordCertificateAssetInstruction({
    authority: signer.publicKey,
    certificationAuthority: certificationAuthorityPda,
    certificate: certificatePda,
    merkleTree,
    assetId,
    leafIndex: nextLeafIndex,
    leafNonce,
    programId,
  });
  const recordSignature = await sendInstruction(
    connection,
    signer,
    recordInstruction,
  );

  return {
    alreadyMinted: false,
    assetId: assetId.toBase58(),
    certificatePda: certificatePda.toBase58(),
    leafIndex: nextLeafIndex,
    leafNonce: leafNonce.toString(),
    merkleTree: merkleTree.toBase58(),
    recordSignature,
  } satisfies MintCertificateResult;
}
