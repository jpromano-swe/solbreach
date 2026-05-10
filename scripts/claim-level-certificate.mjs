#!/usr/bin/env node

import {
  buildClaimLevelCertificateInstruction,
  createConnection,
  fetchAccountOrNull,
  findCertificatePda,
  findUserStatsPda,
  loadKeypair,
  parseOption,
  parseSharedOptions,
  sendInstruction,
  vaultProgramId,
} from "./solbreach-cnft-helpers.mjs";

const HELP = `
Claim a SolBreach level certificate PDA after clearing a level.

Usage:
  node scripts/claim-level-certificate.mjs --level <0-3> [--rpc <url>] [--keypair <path>] [--program-id <pubkey>]
`;

function parseLevel(argv) {
  const raw = parseOption(argv, "--level");
  const level = Number(raw);
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw new Error("--level must be an integer from 0 to 3.");
  }
  return level;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP.trim());
    return;
  }

  const level = parseLevel(argv);
  const options = parseSharedOptions(argv);
  const signer = loadKeypair(options.keypairPath);
  const programId = vaultProgramId(options);
  const connection = createConnection(options.rpcUrl);

  const [userStatsPda] = findUserStatsPda(programId, signer.publicKey);
  const [certificatePda] = findCertificatePda(programId, signer.publicKey, level);

  const existing = await fetchAccountOrNull(connection, certificatePda);
  if (existing) {
    console.log("Level certificate already exists");
    console.log(`  Level: ${level}`);
    console.log(`  Certificate PDA: ${certificatePda.toBase58()}`);
    return;
  }

  const instruction = buildClaimLevelCertificateInstruction({
    user: signer.publicKey,
    userStats: userStatsPda,
    certificate: certificatePda,
    level,
    programId,
  });

  const signature = await sendInstruction(connection, signer, instruction);

  console.log("Level certificate claimed");
  console.log(`  Player: ${signer.publicKey.toBase58()}`);
  console.log(`  Level: ${level}`);
  console.log(`  UserStats PDA: ${userStatsPda.toBase58()}`);
  console.log(`  Certificate PDA: ${certificatePda.toBase58()}`);
  console.log(`  Signature: ${signature}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
