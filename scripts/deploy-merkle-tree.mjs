#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createTree,
  fetchTreeConfigFromSeeds,
  mplBubblegum,
} from "@metaplex-foundation/mpl-bubblegum";
import { generateSigner, keypairIdentity } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

const DEFAULT_RPC_URL = "https://api.devnet.solana.com";
const DEFAULT_KEYPAIR_PATH = "~/.config/solana/id.json";

const HELP = `
Deploy a Metaplex Bubblegum Merkle tree for cNFT minting.

Defaults are sized for SolBreach flag cNFTs:
  maxDepth=14       capacity: 16,384 cNFTs
  maxBufferSize=64  typical concurrent write buffer
  canopyDepth=10    smaller proof payloads for future mints
  public=false      only the tree creator/delegate can mint

Usage:
  npm run deploy:merkle-tree -- --confirm

Options:
  --confirm                 Broadcast the transaction. Omit for a safe config check.
  --rpc <url>               RPC endpoint. Defaults to SOLANA_RPC_URL/RPC_URL or devnet.
  --keypair <path>          Solana keypair JSON path. Defaults to ADMIN_KEYPAIR_PATH or ${DEFAULT_KEYPAIR_PATH}.
  --max-depth <number>      Tree depth. Default: 14.
  --max-buffer-size <num>   Tree buffer size. Default: 64.
  --canopy-depth <number>   Tree canopy depth. Default: 10.
  --public                  Allow anyone to mint into the tree. Default: false.
  --allow-non-devnet        Permit RPC clusters other than devnet.
  --help                    Print this help.

Environment:
  ADMIN_PRIVATE_KEY         JSON array secret key or base58-encoded 64-byte secret key.
  ADMIN_KEYPAIR_PATH        Fallback keypair JSON path.
  SOLANA_RPC_URL / RPC_URL  Fallback RPC endpoint.
`;

loadEnvFile(".env.local");
loadEnvFile(".env");

function loadEnvFile(filePath) {
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

function parseArgs(argv) {
  const options = {
    allowNonDevnet: false,
    canopyDepth: 10,
    confirm: false,
    keypairPath: process.env.ADMIN_KEYPAIR_PATH ?? DEFAULT_KEYPAIR_PATH,
    maxBufferSize: 64,
    maxDepth: 14,
    public: false,
    rpcUrl:
      process.env.SOLANA_RPC_URL ?? process.env.RPC_URL ?? DEFAULT_RPC_URL,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = () => inlineValue ?? argv[++i];

    switch (key) {
      case "--allow-non-devnet":
        options.allowNonDevnet = true;
        break;
      case "--canopy-depth":
        options.canopyDepth = parseInteger(nextValue(), "--canopy-depth");
        break;
      case "--confirm":
        options.confirm = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--keypair":
        options.keypairPath = nextValue();
        break;
      case "--max-buffer-size":
        options.maxBufferSize = parseInteger(nextValue(), "--max-buffer-size");
        break;
      case "--max-depth":
        options.maxDepth = parseInteger(nextValue(), "--max-depth");
        break;
      case "--public":
        options.public = true;
        break;
      case "--rpc":
        options.rpcUrl = nextValue();
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  validateTreeOptions(options);
  return options;
}

function parseInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

function validateTreeOptions(options) {
  if (options.canopyDepth >= options.maxDepth) {
    throw new Error("--canopy-depth must be lower than --max-depth.");
  }

  if (options.maxDepth > 30) {
    throw new Error("--max-depth above 30 is not supported by this script.");
  }
}

function expandTilde(filePath) {
  if (!filePath?.startsWith("~")) return filePath;
  return path.join(os.homedir(), filePath.slice(1));
}

function loadSecretKey(options) {
  if (process.env.ADMIN_PRIVATE_KEY) {
    return parseSecretKey(process.env.ADMIN_PRIVATE_KEY, "ADMIN_PRIVATE_KEY");
  }

  const resolvedPath = expandTilde(options.keypairPath);
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(
      `No admin keypair found. Set ADMIN_PRIVATE_KEY or create ${resolvedPath}.`
    );
  }

  return parseSecretKey(
    fs.readFileSync(resolvedPath, "utf8"),
    `keypair file ${resolvedPath}`
  );
}

function parseSecretKey(rawValue, source) {
  const trimmed = rawValue.trim();
  let bytes;

  if (trimmed.startsWith("[")) {
    bytes = Uint8Array.from(JSON.parse(trimmed));
  } else if (/^\d+(,\s*\d+)+$/.test(trimmed)) {
    bytes = Uint8Array.from(trimmed.split(",").map((value) => Number(value)));
  } else {
    bytes = base58.serialize(trimmed);
  }

  if (bytes.length !== 64) {
    throw new Error(`${source} must decode to a 64-byte Solana secret key.`);
  }

  return bytes;
}

function formatCapacity(maxDepth) {
  return (2n ** BigInt(maxDepth)).toLocaleString("en-US");
}

function formatSol(amount) {
  const lamports = Number(amount.basisPoints);
  return `${(lamports / 1_000_000_000).toFixed(6)} SOL`;
}

function printSummary(options, umi, payer, merkleTree) {
  console.log("Merkle tree deployment summary");
  console.log(`  Cluster: ${umi.rpc.getCluster()}`);
  console.log(`  RPC: ${options.rpcUrl}`);
  console.log(`  Fee payer / tree creator: ${payer.publicKey}`);
  console.log(`  New tree address: ${merkleTree.publicKey}`);
  console.log(`  Max depth: ${options.maxDepth}`);
  console.log(`  Capacity: ${formatCapacity(options.maxDepth)} cNFTs`);
  console.log(`  Max buffer size: ${options.maxBufferSize}`);
  console.log(`  Canopy depth: ${options.canopyDepth}`);
  console.log(`  Public minting: ${options.public}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(HELP.trim());
    return;
  }

  const umi = createUmi(options.rpcUrl).use(mplBubblegum());
  const cluster = umi.rpc.getCluster();

  if (cluster !== "devnet" && !options.allowNonDevnet) {
    throw new Error(
      `Refusing to deploy to ${cluster}. Use --allow-non-devnet only if this is intentional.`
    );
  }

  const keypair = umi.eddsa.createKeypairFromSecretKey(loadSecretKey(options));
  umi.use(keypairIdentity(keypair));

  const merkleTree = generateSigner(umi);
  printSummary(options, umi, umi.identity, merkleTree);

  const balance = await umi.rpc.getBalance(umi.identity.publicKey, {
    commitment: "confirmed",
  });
  console.log(`  Payer balance: ${formatSol(balance)}`);

  const builder = await createTree(umi, {
    merkleTree,
    maxDepth: options.maxDepth,
    maxBufferSize: options.maxBufferSize,
    canopyDepth: options.canopyDepth,
    public: options.public,
  });

  const simulatedTx = await builder.buildAndSign(umi);
  const simulation = await umi.rpc.simulateTransaction(simulatedTx, {
    commitment: "confirmed",
    verifySignatures: true,
  });

  if (simulation.err) {
    console.error("Simulation failed:");
    console.error(JSON.stringify(simulation.err, null, 2));
    if (simulation.logs?.length) console.error(simulation.logs.join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(
    `Simulation succeeded. Units consumed: ${simulation.unitsConsumed ?? "unknown"}`
  );

  if (!options.confirm) {
    console.log("Dry run only. Re-run with --confirm to deploy the tree.");
    return;
  }

  const { signature, result } = await builder.sendAndConfirm(umi, {
    confirm: { commitment: "confirmed" },
    send: { preflightCommitment: "confirmed", skipPreflight: false },
  });
  const signatureBase58 =
    typeof signature === "string"
      ? signature
      : base58.deserialize(signature)[0];

  if (result.value.err) {
    console.error("Transaction confirmed with error:");
    console.error(JSON.stringify(result.value.err, null, 2));
    process.exitCode = 1;
    return;
  }

  const treeConfig = await fetchTreeConfigFromSeeds(
    umi,
    { merkleTree: merkleTree.publicKey },
    { commitment: "confirmed" }
  );

  console.log("Merkle tree deployed");
  console.log(`  Signature: ${signatureBase58}`);
  console.log(
    `  Explorer: https://explorer.solana.com/tx/${signatureBase58}?cluster=devnet`
  );
  console.log(`  MERKLE_TREE_ADDRESS=${merkleTree.publicKey}`);
  console.log(`  TREE_CONFIG_ADDRESS=${treeConfig.publicKey}`);
  console.log(`  Tree creator: ${treeConfig.treeCreator}`);
  console.log(`  Tree delegate: ${treeConfig.treeDelegate}`);
  console.log(
    `  Total mint capacity: ${treeConfig.totalMintCapacity.toString()}`
  );
  console.log(`  Number minted: ${treeConfig.numMinted.toString()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
