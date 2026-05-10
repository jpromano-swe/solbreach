#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const operatorPath = path.join(repoRoot, "scripts", "solbreach-operator.mjs");

const HELP = `
SolBreach player entrypoint: Level 3 / The Trojan Horse

Usage:
  node players/level3/level3.mjs setup [--rpc <url>] [--keypair <path>] [--amount <raw-units>]
  node players/level3/level3.mjs exploit [--rpc <url>] [--keypair <path>] --external-program <pubkey>
  node players/level3/level3.mjs verify [--rpc <url>] [--keypair <path>]
  node players/level3/level3.mjs status [--rpc <url>] [--keypair <path>]

This level exploits arbitrary CPI. You deploy or reuse a malicious external
program, pass it into the unchecked delegation slot, and use the forwarded PDA
signer to drain the guild bounty.
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
    [operatorPath, "level3", action, ...passthroughArgs],
    {
      cwd: repoRoot,
      stdio: "inherit",
    }
  );

  process.exit(result.status ?? 1);
}
