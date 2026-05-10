#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const operatorPath = path.join(repoRoot, "scripts", "solbreach-operator.mjs");

const HELP = `
SolBreach player entrypoint: Level 2 / Identity Thief

Usage:
  node players/level2/level2.mjs setup [--rpc <url>] [--keypair <path>] [--initial-commander <pubkey>]
  node players/level2/level2.mjs exploit [--rpc <url>] [--keypair <path>]
  node players/level2/level2.mjs verify [--rpc <url>] [--keypair <path>]
  node players/level2/level2.mjs status [--rpc <url>] [--keypair <path>]

This level exploits a static PDA seed. Any signer can overwrite the single
global profile account because the seed set omits the user pubkey.
`.trim();

main();

function main() {
  const [, , action, ...rest] = process.argv;

  if (!action || action === "--help" || action === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  runOfficialFlow(action, rest);
}

function runOfficialFlow(action, passthroughArgs) {
  const result = spawnSync(
    "node",
    [operatorPath, "level2", action, ...passthroughArgs],
    {
      cwd: repoRoot,
      stdio: "inherit",
    }
  );

  process.exit(result.status ?? 1);
}
