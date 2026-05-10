#!/usr/bin/env node

import {
  fetchTreeConfigFromSeeds,
  findLeafAssetIdPda,
  mintV1,
  mplBubblegum,
  parseLeafFromMintV1Transaction,
} from "@metaplex-foundation/mpl-bubblegum";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

import {
  buildRecordCertificateAssetInstruction,
  createConnection,
  fetchAccountOrNull,
  findCertificatePda,
  findCertificationAuthorityPda,
  loadKeypair,
  parseLevelCertificateAccount,
  parseOption,
  parseSharedOptions,
  sendInstruction,
  toPublicKey,
  vaultProgramId,
} from "./solbreach-cnft-helpers.mjs";

const DEFAULT_BASE_URL =
  process.env.APP_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.PUBLIC_APP_URL ??
  "";

const HELP = `
Mint a SolBreach certificate cNFT and record its compressed asset binding on-chain.

Usage:
  node scripts/mint-level-certificate.mjs --level <0-3> --player <pubkey> --merkle-tree <pubkey> [--base-url <url>] [--rpc <url>] [--keypair <path>] [--program-id <pubkey>]

Notes:
  - The player must already have claimed their certificate PDA.
  - The signer must match the on-chain certification authority.
  - The metadata URI points at /api/nfts/certifications/:level/:player on the app domain.
`;

function parseLevel(argv) {
  const raw = parseOption(argv, "--level");
  const level = Number(raw);
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw new Error("--level must be an integer from 0 to 3.");
  }
  return level;
}

function parseRequiredAddress(argv, flag, label) {
  const value = parseOption(argv, flag);
  if (!value) {
    throw new Error(`${flag} is required.`);
  }
  return toPublicKey(value, label);
}

function parseBaseUrl(argv) {
  const baseUrl = parseOption(argv, "--base-url", DEFAULT_BASE_URL);
  if (!baseUrl) {
    throw new Error(
      "A public app base URL is required. Pass --base-url or set APP_BASE_URL / NEXT_PUBLIC_APP_URL.",
    );
  }
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function toSignatureString(signature) {
  return typeof signature === "string"
    ? signature
    : base58.deserialize(signature)[0];
}

function metadataUri({
  baseUrl,
  level,
  player,
  cluster,
  programId,
  merkleTree,
  assetId,
  leafIndex,
}) {
  const url = new URL(
    `/api/nfts/certifications/${level}/${player.toBase58()}`,
    `${baseUrl}/`,
  );
  url.searchParams.set("cluster", cluster);
  url.searchParams.set("challengeProgramId", programId.toBase58());
  url.searchParams.set("merkleTree", merkleTree.toBase58());
  url.searchParams.set("assetId", assetId.toString());
  url.searchParams.set("leafIndex", String(leafIndex));
  return url.toString();
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP.trim());
    return;
  }

  const level = parseLevel(argv);
  const options = parseSharedOptions(argv);
  const baseUrl = parseBaseUrl(argv);
  const player = parseRequiredAddress(argv, "--player", "Player");
  const merkleTree = parseRequiredAddress(argv, "--merkle-tree", "Merkle tree");

  const authority = loadKeypair(options.keypairPath);
  const programId = vaultProgramId(options);
  const connection = createConnection(options.rpcUrl);

  const [certificatePda] = findCertificatePda(programId, player, level);
  const [certificationAuthorityPda] = findCertificationAuthorityPda(programId);

  const certificateAccount = await fetchAccountOrNull(connection, certificatePda);
  if (!certificateAccount) {
    throw new Error(
      `Certificate PDA ${certificatePda.toBase58()} does not exist. Run the claim script first.`,
    );
  }

  const certificate = parseLevelCertificateAccount(certificateAccount.data);
  if (certificate.minted) {
    console.log("Certificate asset already recorded");
    console.log(`  Certificate PDA: ${certificatePda.toBase58()}`);
    console.log(`  Asset ID: ${certificate.assetId.toBase58()}`);
    console.log(`  Merkle tree: ${certificate.merkleTree.toBase58()}`);
    console.log(`  Leaf index: ${certificate.leafIndex}`);
    console.log(`  Leaf nonce: ${certificate.leafNonce.toString()}`);
    return;
  }

  const umi = createUmi(options.rpcUrl).use(mplBubblegum());
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(authority.secretKey);
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

  const uri = metadataUri({
    baseUrl,
    level,
    player,
    cluster: options.cluster,
    programId,
    merkleTree,
    assetId: predictedAssetId,
    leafIndex: nextLeafIndex,
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

  const { signature, result } = await builder.sendAndConfirm(umi, {
    confirm: { commitment: "confirmed" },
    send: { preflightCommitment: "confirmed", skipPreflight: false },
  });

  if (result.value.err) {
    throw new Error(`cNFT mint failed: ${JSON.stringify(result.value.err)}`);
  }

  const signatureBase58 = toSignatureString(signature);
  const leaf = await parseLeafFromMintV1Transaction(umi, signatureBase58);
  const assetId = toPublicKey(leaf.id.toString(), "Bubblegum asset id");

  if (!assetId.equals(toPublicKey(predictedAssetId.toString(), "Predicted asset id"))) {
    throw new Error(
      `Minted asset id ${assetId.toBase58()} did not match predicted asset id ${predictedAssetId.toString()}.`,
    );
  }

  const recordInstruction = buildRecordCertificateAssetInstruction({
    authority: authority.publicKey,
    certificationAuthority: certificationAuthorityPda,
    certificate: certificatePda,
    merkleTree,
    assetId,
    leafIndex: nextLeafIndex,
    leafNonce: leaf.nonce,
    programId,
  });
  const recordSignature = await sendInstruction(
    connection,
    authority,
    recordInstruction,
  );

  console.log("SolBreach certificate cNFT minted");
  console.log(`  Player: ${player.toBase58()}`);
  console.log(`  Level: ${level}`);
  console.log(`  Certificate PDA: ${certificatePda.toBase58()}`);
  console.log(`  Merkle tree: ${merkleTree.toBase58()}`);
  console.log(`  Asset ID: ${assetId.toBase58()}`);
  console.log(`  Leaf index: ${nextLeafIndex}`);
  console.log(`  Leaf nonce: ${leaf.nonce.toString()}`);
  console.log(`  Metadata URI: ${uri}`);
  console.log(`  Mint signature: ${signatureBase58}`);
  console.log(`  Record signature: ${recordSignature}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
