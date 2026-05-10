#!/usr/bin/env node

import {
  createConnection,
  fetchAccountOrNull,
  findCertificationAuthorityPda,
  loadKeypair,
  parseOption,
  parseSharedOptions,
  sendInstruction,
  toPublicKey,
  vaultProgramId,
  buildInitCertificationAuthorityInstruction,
} from "./solbreach-cnft-helpers.mjs";

const HELP = `
Initialize the SolBreach certification authority PDA.

Usage:
  node scripts/init-certification-authority.mjs [--authority <pubkey>] [--rpc <url>] [--keypair <path>] [--program-id <pubkey>]

Defaults:
  authority = signer pubkey
`;

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP.trim());
    return;
  }

  const options = parseSharedOptions(argv);
  const signer = loadKeypair(options.keypairPath);
  const authority = toPublicKey(
    parseOption(argv, "--authority", signer.publicKey.toBase58()),
    "Authority",
  );
  const programId = vaultProgramId(options);
  const connection = createConnection(options.rpcUrl);
  const [certificationAuthorityPda] = findCertificationAuthorityPda(programId);

  const existing = await fetchAccountOrNull(connection, certificationAuthorityPda);
  if (existing) {
    console.log("Certification authority already exists");
    console.log(`  PDA: ${certificationAuthorityPda.toBase58()}`);
    console.log(`  Authority (requested): ${authority.toBase58()}`);
    return;
  }

  const instruction = buildInitCertificationAuthorityInstruction({
    admin: signer.publicKey,
    certificationAuthority: certificationAuthorityPda,
    authority,
    programId,
  });

  const signature = await sendInstruction(connection, signer, instruction);

  console.log("Certification authority initialized");
  console.log(`  PDA: ${certificationAuthorityPda.toBase58()}`);
  console.log(`  Authority: ${authority.toBase58()}`);
  console.log(`  Signature: ${signature}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
