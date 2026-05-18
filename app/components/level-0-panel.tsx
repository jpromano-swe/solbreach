"use client";

import type { Address } from "@solana/kit";
import {
  AddressRow,
  BriefCard,
  InlineStep,
  MiniBlock,
  Pill,
  SequenceCard,
  SkeletonLine,
  StatusTextRow,
} from "./level-ui";

type StepState = "idle" | "active" | "done";

type Level0Snapshot = {
  userStatsPda: Address;
  level0StatePda: Address;
  hasUserStats: boolean;
  hasLevel0State: boolean;
  completedLevels: boolean[];
  isCompleted: boolean;
};

type LevelCertificateSnapshot = {
  assetId: Address | null;
  certificatePda: Address;
  exists: boolean;
  leafIndex: number | null;
  leafNonce: bigint | null;
  level: 0 | 1 | 2 | 3;
  merkleTree: Address | null;
  minted: boolean;
};

type StageConfig = {
  badge: string;
  title: string;
  description: string;
  actionLabel: string | null;
  actionKind: "primary" | "secondary";
  onAction?: () => Promise<void>;
};

export function Level0Panel({
  address,
  certificate,
  copied,
  getExplorerUrl,
  handleAirdrop,
  isLevel0Loading,
  isMinting,
  isSending,
  level0Error,
  level0State,
  onCopy,
  onMint,
  progressValue,
  stage,
  stepStates,
  status,
}: {
  address?: string;
  certificate?: LevelCertificateSnapshot;
  copied: string | null;
  getExplorerUrl: (path: string) => string;
  handleAirdrop: () => Promise<void>;
  isLevel0Loading: boolean;
  isMinting: boolean;
  isSending: boolean;
  level0Error: unknown;
  level0State?: Level0Snapshot;
  onCopy: (label: string, value: string) => Promise<void>;
  onMint: () => Promise<void>;
  progressValue: number;
  stage: StageConfig;
  stepStates: [StepState, StepState, StepState];
  status: string;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <MiniBlock
            label="Registry"
            value={level0State?.hasUserStats ? "Live" : "Missing"}
            detail="Persistent player PDA"
          />
          <MiniBlock
            label="Instance"
            value={
              level0State?.hasLevel0State
                ? "Open"
                : level0State?.isCompleted
                  ? "Closed"
                  : "Pending"
            }
            detail="Temporary Level 0 PDA"
          />
          <MiniBlock
            label="Completion"
            value={level0State?.isCompleted ? "Cleared" : `${progressValue}%`}
            detail="Warmup progress"
          />
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Sequence
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Level 0 is the same account pattern every later level depends
                on: registry first, temporary instance second, closeout third.
              </p>
            </div>
            <Pill>{stage.badge}</Pill>
          </div>

          <div className="mt-5 h-1.5 rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <SequenceCard
              index="01"
              title="Registry"
              body="Create `UserStats`."
              state={stepStates[0]}
            />
            <SequenceCard
              index="02"
              title="Instance"
              body="Open the temporary level PDA."
              state={stepStates[1]}
            />
            <SequenceCard
              index="03"
              title="Closeout"
              body="Verify completion and reclaim rent."
              state={stepStates[2]}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <BriefCard
            eyebrow="Why it exists"
            title="Warm the contract path before the exploits."
            body="The first level is not trying to trick the player. It exists to guarantee the registry, per-level PDA, and closeout loop behave correctly before later levels get adversarial."
          />
          <BriefCard
            eyebrow="What comes next"
            title="Levels 1-3 are workstation levels."
            body="The browser becomes a board and a verifier surface. The real actor should be the local operator keypair running against localhost or a devnet test environment."
          />
        </div>
      </div>

      <aside className="rounded-[28px] border border-border bg-background/75 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
              Mission console
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
              {stage.title}
            </h3>
          </div>
          {address ? (
            <button
              onClick={() => {
                void onCopy("wallet", address);
              }}
              className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {copied === "wallet" ? "Done" : "Copy wallet"}
            </button>
          ) : null}
        </div>

        <p className="mt-3 text-sm leading-6 text-muted">{stage.description}</p>

        <div className="mt-5 space-y-3">
          <InlineStep
            index="01"
            label="Create registry"
            state={stepStates[0]}
          />
          <InlineStep
            index="02"
            label="Initialize level"
            state={stepStates[1]}
          />
          <InlineStep
            index="03"
            label="Verify and close"
            state={stepStates[2]}
          />
        </div>

        <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
          <div className="space-y-4">
            <AddressRow
              label="Wallet"
              value={address}
              copied={copied === "wallet-address"}
              explorerUrl={
                address ? getExplorerUrl(`/address/${address}`) : null
              }
              onCopy={
                address
                  ? () => {
                      void onCopy("wallet-address", address);
                    }
                  : undefined
              }
            />
            <AddressRow
              label="UserStats"
              value={level0State?.userStatsPda}
              copied={copied === "user-stats"}
              explorerUrl={
                level0State?.userStatsPda
                  ? getExplorerUrl(`/address/${level0State.userStatsPda}`)
                  : null
              }
              onCopy={
                level0State?.userStatsPda
                  ? () => {
                      void onCopy("user-stats", level0State.userStatsPda);
                    }
                  : undefined
              }
            />
            <AddressRow
              label="Level0"
              value={level0State?.level0StatePda}
              copied={copied === "level0"}
              explorerUrl={
                level0State?.level0StatePda
                  ? getExplorerUrl(`/address/${level0State.level0StatePda}`)
                  : null
              }
              onCopy={
                level0State?.level0StatePda
                  ? () => {
                      void onCopy("level0", level0State.level0StatePda);
                    }
                  : undefined
              }
            />
            <StatusTextRow
              label="Completion"
              value={
                level0State?.isCompleted
                  ? "completed_levels[0] = true"
                  : "Awaiting verification"
              }
            />
            <AddressRow
              label="Certificate"
              value={certificate?.certificatePda}
              copied={copied === "level0-certificate"}
              explorerUrl={
                certificate?.certificatePda
                  ? getExplorerUrl(`/address/${certificate.certificatePda}`)
                  : null
              }
              onCopy={
                certificate?.certificatePda
                  ? () => {
                      void onCopy(
                        "level0-certificate",
                        certificate.certificatePda
                      );
                    }
                  : undefined
              }
            />
            <AddressRow
              label="Asset"
              value={certificate?.minted ? certificate.assetId : null}
              copied={copied === "level0-asset"}
              explorerUrl={
                certificate?.minted && certificate.assetId
                  ? getExplorerUrl(`/address/${certificate.assetId}`)
                  : null
              }
              onCopy={
                certificate?.minted && certificate.assetId
                  ? () => {
                      void onCopy("level0-asset", certificate.assetId!);
                    }
                  : undefined
              }
            />
          </div>
        </div>

        {status === "connected" && isLevel0Loading ? (
          <div className="mt-5 space-y-3">
            <SkeletonLine className="h-12" />
            <SkeletonLine className="h-28" />
          </div>
        ) : null}

        {status === "connected" && level0Error ? (
          <div className="mt-5 rounded-[22px] border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Could not read Level 0 state
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {level0Error instanceof Error
                ? level0Error.message
                : "The selected cluster returned an unexpected account response."}
            </p>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {stage.actionLabel && stage.onAction ? (
            <button
              onClick={() => {
                void stage.onAction?.();
              }}
              disabled={isSending}
              className={`min-h-13 w-full rounded-full px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55 ${
                stage.actionKind === "primary"
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "border border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              {isSending ? "Submitting..." : stage.actionLabel}
            </button>
          ) : (
            <div className="rounded-full border border-border bg-card px-4 py-3 text-center text-sm text-muted">
              {status === "connected"
                ? "Checkpoint state is already settled."
                : "Connect a wallet to unlock the checkpoint actions."}
            </div>
          )}

          {address ? (
            <button
              onClick={() => {
                void handleAirdrop();
              }}
              disabled={isSending}
              className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Fund wallet with 1 SOL
            </button>
          ) : null}

          <button
            onClick={() => {
              void onMint();
            }}
            disabled={
              !level0State?.isCompleted || certificate?.minted || isMinting
            }
            className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted"
          >
            {certificate?.minted
              ? "Hello SolBreach cNFT minted"
              : isMinting
                ? "Minting cNFT..."
                : level0State?.isCompleted
                  ? "Mint Hello SolBreach cNFT"
                  : "Mint locked"}
          </button>
        </div>
      </aside>
    </div>
  );
}
