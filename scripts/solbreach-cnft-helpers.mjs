import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

export const DEFAULT_RPC_URL = "https://api.devnet.solana.com";
export const DEFAULT_KEYPAIR_PATH = "~/.config/solana/id.json";
export const DEFAULT_VAULT_PROGRAM_ID =
  "aVf7hEpHmn7L5ZPBhtu13apZREM7VdwFKzSJ9yNovf2";

loadEnvFile(".env.local");
loadEnvFile(".env");

export function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function parseSharedOptions(argv) {
  const options = {
    cluster: process.env.SOLBREACH_CLUSTER ?? "devnet",
    keypairPath:
      process.env.ADMIN_KEYPAIR_PATH ??
      process.env.KEYPAIR_PATH ??
      DEFAULT_KEYPAIR_PATH,
    rpcUrl:
      process.env.SOLANA_RPC_URL ?? process.env.RPC_URL ?? DEFAULT_RPC_URL,
    vaultProgramId:
      process.env.VAULT_PROGRAM_ID ?? DEFAULT_VAULT_PROGRAM_ID,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = () => inlineValue ?? argv[++i];

    switch (key) {
      case "--cluster":
        options.cluster = nextValue();
        break;
      case "--keypair":
        options.keypairPath = nextValue();
        break;
      case "--program-id":
        options.vaultProgramId = nextValue();
        break;
      case "--rpc":
        options.rpcUrl = nextValue();
        break;
      default:
        break;
    }
  }

  return options;
}

export function parseFlag(argv, name) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === name) return true;
  }
  return false;
}

export function parseOption(argv, name, fallback = undefined) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [key, inlineValue] = arg.split("=", 2);
    if (key === name) {
      return inlineValue ?? argv[i + 1];
    }
  }
  return fallback;
}

export function expandTilde(filePath) {
  if (!filePath?.startsWith("~")) return filePath;
  return path.join(os.homedir(), filePath.slice(1));
}

export function loadKeypair(filePath) {
  const resolvedPath = expandTilde(filePath);
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(`Keypair file not found: ${resolvedPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export function createConnection(rpcUrl) {
  return new Connection(rpcUrl, "confirmed");
}

export function toPublicKey(value, label) {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`${label} is not a valid public key.`);
  }
}

export function vaultProgramId(options) {
  return toPublicKey(options.vaultProgramId, "Vault program id");
}

export function discriminator(name) {
  return crypto.createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

export function encodePubkey(publicKey) {
  return Buffer.from(publicKey.toBytes());
}

export function encodeU8(value) {
  const buffer = Buffer.alloc(1);
  buffer.writeUInt8(value);
  return buffer;
}

export function encodeU32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

export function encodeU64(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

export function findUserStatsPda(programId, player) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stats"), player.toBuffer()],
    programId,
  );
}

export function findCertificationAuthorityPda(programId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("certification_authority")],
    programId,
  );
}

export function findCertificatePda(programId, player, level) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("certificate"), player.toBuffer(), Buffer.from([level])],
    programId,
  );
}

export function buildInitCertificationAuthorityInstruction({
  admin,
  certificationAuthority,
  authority,
  programId,
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

export function buildClaimLevelCertificateInstruction({
  user,
  userStats,
  certificate,
  level,
  programId,
}) {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userStats, isSigner: false, isWritable: false },
      { pubkey: certificate, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      discriminator("claim_level_certificate"),
      encodeU8(level),
    ]),
  });
}

export function buildRecordCertificateAssetInstruction({
  authority,
  certificationAuthority,
  certificate,
  merkleTree,
  assetId,
  leafIndex,
  leafNonce,
  programId,
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

export async function sendInstruction(connection, payer, instruction) {
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: payer.publicKey,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(instruction);

  const signature = await sendAndConfirmTransaction(connection, transaction, [payer], {
    commitment: "confirmed",
  });

  return signature;
}

export function parseLevelCertificateAccount(data) {
  if (!data || data.length < 128) {
    throw new Error("LevelCertificate account data is missing or too short.");
  }

  let offset = 8;
  const player = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const merkleTree = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const assetId = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const level = data.readUInt8(offset);
  offset += 1;
  const leafIndex = data.readUInt32LE(offset);
  offset += 4;
  const leafNonce = data.readBigUInt64LE(offset);
  offset += 8;
  const minted = data.readUInt8(offset) === 1;
  offset += 1;
  const transferable = data.readUInt8(offset) === 1;
  offset += 1;
  const claimedAt = data.readBigInt64LE(offset);
  offset += 8;
  const mintedAt = data.readBigInt64LE(offset);
  offset += 8;
  const bump = data.readUInt8(offset);

  return {
    assetId,
    bump,
    claimedAt,
    leafIndex,
    leafNonce,
    level,
    merkleTree,
    minted,
    mintedAt,
    player,
    transferable,
  };
}

export async function fetchAccountOrNull(connection, publicKey) {
  return connection.getAccountInfo(publicKey, "confirmed");
}
