#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const operatorPath = path.join(repoRoot, "scripts", "solbreach-operator.mjs");

const HELP = `
SolBreach player entrypoint: Level 0

Usage:
  node players/level0/level0.mjs setup [--rpc <url>] [--keypair <path>]
  node players/level0/level0.mjs verify [--rpc <url>] [--keypair <path>]
  node players/level0/level0.mjs status [--rpc <url>] [--keypair <path>]

This is the wallet warmup level. It bootstraps your UserStats PDA and your
temporary Level0State PDA, then verifies and closes the level instance.
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
    [operatorPath, "level0", action, ...passthroughArgs],
    {
      cwd: repoRoot,
      stdio: "inherit",
    }
  );

  process.exit(result.status ?? 1);
}
