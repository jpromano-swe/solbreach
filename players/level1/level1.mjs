#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const operatorPath = path.join(repoRoot, "scripts", "solbreach-operator.mjs");

const HELP = `
SolBreach player entrypoint: Level 1 / The Illusionist

Usage:
  node players/level1/level1.mjs setup [--rpc <url>] [--keypair <path>] [--expected-mint <pubkey>] [--amount <raw-units>]
  node players/level1/level1.mjs exploit [--rpc <url>] [--keypair <path>] [--vault <pubkey>] [--user-token-account <pubkey>] [--amount <raw-units>]
  node players/level1/level1.mjs verify [--rpc <url>] [--keypair <path>]
  node players/level1/level1.mjs status [--rpc <url>] [--keypair <path>]

This level exploits account substitution. The vulnerable deposit path accepts
counterfeit token accounts because it never constrains the vault mint.
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
    [operatorPath, "level1", action, ...passthroughArgs],
    {
      cwd: repoRoot,
      stdio: "inherit",
    }
  );

  process.exit(result.status ?? 1);
}
