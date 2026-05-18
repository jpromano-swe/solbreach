"use client";

import { isAddress, type Address } from "@solana/kit";
import {
  AddressRow,
  BriefCard,
  ChecklistItem,
  Pill,
  SequenceCard,
  SkeletonLine,
  StatusTextRow,
  TestingField,
} from "./level-ui";

type Level3Snapshot = {
  guildAuthorityPda: Address;
  level3StatePda: Address;
  hasGuildAuthority: boolean;
  rewardMint: Address | null;
  bountyVault: Address | null;
  bountyAmount: bigint;
  hasLevel3State: boolean;
  rewardAccount: Address | null;
  rewardAmount: bigint;
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

export function Level3Panel({
  address,
  certificate,
  copied,
  getExplorerUrl,
  isLoading,
  isMinting,
  isSending,
  level3Amount,
  level3BountyVault,
  level3Completed,
  level3Error,
  level3ExternalProgram,
  level3RewardMint,
  level3State,
  level3UserRewardAccount,
  onChangeAmount,
  onChangeBountyVault,
  onChangeExternalProgram,
  onChangeRewardMint,
  onChangeUserRewardAccount,
  onCopy,
  onDelegateTask,
  onInitGuildAuthority,
  onInitLevel3,
  onMint,
  onVerify,
  stage,
  status,
}: {
  address?: string;
  certificate?: LevelCertificateSnapshot;
  copied: string | null;
  getExplorerUrl: (path: string) => string;
  isLoading: boolean;
  isMinting: boolean;
  isSending: boolean;
  level3Amount: string;
  level3BountyVault: string;
  level3Completed: boolean;
  level3Error: unknown;
  level3ExternalProgram: string;
  level3RewardMint: string;
  level3State?: Level3Snapshot;
  level3UserRewardAccount: string;
  onChangeAmount: (value: string) => void;
  onChangeBountyVault: (value: string) => void;
  onChangeExternalProgram: (value: string) => void;
  onChangeRewardMint: (value: string) => void;
  onChangeUserRewardAccount: (value: string) => void;
  onCopy: (label: string, value: string) => Promise<void>;
  onDelegateTask: () => Promise<void>;
  onInitGuildAuthority: () => Promise<void>;
  onInitLevel3: () => Promise<void>;
  onMint: () => void;
  onVerify: () => Promise<void>;
  stage: StageConfig;
  status: string;
}) {
  const delegated =
    (level3State?.rewardAmount ?? 0n) >= (level3State?.bountyAmount ?? 0n);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <BriefCard
            eyebrow="Arbitrary CPI"
            title="The guild checks the uniform, not the mercenary's identity."
            body="Level 3 forwards the guild authority signer into any external program the player supplies. Once the caller controls that CPI target, the bounty vault becomes theirs to drain."
          />
          <BriefCard
            eyebrow="Attacker program"
            title="This one needs a deployed contract, not just a crafted client account set."
            body="Use the mercenary sample or your own program off-screen, then bring the external program id and reward token account back into the board for the delegated execution and verify steps."
          />
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Exploit pipeline
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Bootstrap the shared guild authority, open your Level 3 state,
                then delegate into an attacker program that uses the forwarded
                signer to drain the bounty vault. Only the verifier can unlock
                the mint gate.
              </p>
            </div>
            <Pill>{stage.badge}</Pill>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SequenceCard
              index="01"
              title="Guild"
              body="Register the reward mint and bounty vault."
              state={
                level3Completed || level3State?.hasGuildAuthority
                  ? "done"
                  : "active"
              }
            />
            <SequenceCard
              index="02"
              title="Instance"
              body="Open your Level 3 PDA."
              state={
                level3Completed
                  ? "done"
                  : level3State?.hasLevel3State
                    ? "done"
                    : level3State?.hasGuildAuthority
                      ? "active"
                      : "idle"
              }
            />
            <SequenceCard
              index="03"
              title="Delegate"
              body="Forward the signer into your attacker program."
              state={
                level3Completed
                  ? "done"
                  : delegated
                    ? "done"
                    : level3State?.hasLevel3State
                      ? "active"
                      : "idle"
              }
            />
            <SequenceCard
              index="04"
              title="Verify"
              body="Close the instance and unlock mint."
              state={level3Completed ? "done" : delegated ? "active" : "idle"}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TestingField
              label="Reward mint"
              value={level3RewardMint}
              onChange={onChangeRewardMint}
              placeholder="Pre-created SPL mint used for the bounty"
            />
            <TestingField
              label="Bounty vault"
              value={level3BountyVault}
              onChange={onChangeBountyVault}
              placeholder="Token account owned by the guild PDA"
            />
            <TestingField
              label="User reward account"
              value={level3UserRewardAccount}
              onChange={onChangeUserRewardAccount}
              placeholder="Your token account for the drained bounty"
            />
            <TestingField
              label="External program"
              value={level3ExternalProgram}
              onChange={onChangeExternalProgram}
              placeholder="Mercenary or custom attacker program id"
            />
            <TestingField
              label="Raw amount"
              value={level3Amount}
              onChange={onChangeAmount}
              placeholder="1000000"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button
              onClick={() => {
                void onInitGuildAuthority();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize guild
            </button>
            <button
              onClick={() => {
                void onInitLevel3();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize level
            </button>
            <button
              onClick={() => {
                void onDelegateTask();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Run delegated CPI
            </button>
            <button
              onClick={() => {
                void onVerify();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Verify and close
            </button>
          </div>

          <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
            <StatusTextRow
              label="Reward balance"
              value={`${(level3State?.rewardAmount ?? 0n).toString()} / ${(level3State?.bountyAmount ?? 0n).toString()}`}
            />
            <div className="mt-3 h-1.5 rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-300"
                style={{
                  width: `${
                    level3State?.bountyAmount
                      ? Math.min(
                          Number(
                            ((level3State.rewardAmount ?? 0n) * 100n) /
                              level3State.bountyAmount
                          ),
                          100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[28px] border border-border bg-background/75 p-5">
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
                  void onCopy("level3-wallet", address);
                }}
                className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {copied === "level3-wallet" ? "Done" : "Copy wallet"}
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-6 text-muted">
            {stage.description}
          </p>

          <div className="mt-5 rounded-[22px] border border-border bg-card/80 p-4">
            <div className="space-y-4">
              <AddressRow
                label="Wallet"
                value={address}
                copied={copied === "level3-wallet-address"}
                explorerUrl={
                  address ? getExplorerUrl(`/address/${address}`) : null
                }
                onCopy={
                  address
                    ? () => {
                        void onCopy("level3-wallet-address", address);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Guild"
                value={level3State?.guildAuthorityPda}
                copied={copied === "level3-guild"}
                explorerUrl={
                  level3State?.guildAuthorityPda
                    ? getExplorerUrl(
                        `/address/${level3State.guildAuthorityPda}`
                      )
                    : null
                }
                onCopy={
                  level3State?.guildAuthorityPda
                    ? () => {
                        void onCopy(
                          "level3-guild",
                          level3State.guildAuthorityPda
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Level3"
                value={level3State?.level3StatePda}
                copied={copied === "level3-pda"}
                explorerUrl={
                  level3State?.level3StatePda
                    ? getExplorerUrl(`/address/${level3State.level3StatePda}`)
                    : null
                }
                onCopy={
                  level3State?.level3StatePda
                    ? () => {
                        void onCopy("level3-pda", level3State.level3StatePda);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Certificate"
                value={certificate?.certificatePda}
                copied={copied === "level3-certificate"}
                explorerUrl={
                  certificate?.certificatePda
                    ? getExplorerUrl(`/address/${certificate.certificatePda}`)
                    : null
                }
                onCopy={
                  certificate?.certificatePda
                    ? () => {
                        void onCopy(
                          "level3-certificate",
                          certificate.certificatePda
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Reward mint"
                value={
                  level3State?.rewardMint ??
                  (level3RewardMint.trim() ? level3RewardMint.trim() : null)
                }
                copied={copied === "level3-mint"}
                explorerUrl={
                  level3State?.rewardMint
                    ? getExplorerUrl(`/address/${level3State.rewardMint}`)
                    : isAddress(level3RewardMint.trim())
                      ? getExplorerUrl(`/address/${level3RewardMint.trim()}`)
                      : null
                }
                onCopy={
                  level3State?.rewardMint || level3RewardMint.trim()
                    ? () => {
                        void onCopy(
                          "level3-mint",
                          level3State?.rewardMint ?? level3RewardMint.trim()
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Bounty vault"
                value={
                  level3State?.bountyVault ??
                  (level3BountyVault.trim() ? level3BountyVault.trim() : null)
                }
                copied={copied === "level3-bounty"}
                explorerUrl={
                  level3State?.bountyVault
                    ? getExplorerUrl(`/address/${level3State.bountyVault}`)
                    : isAddress(level3BountyVault.trim())
                      ? getExplorerUrl(`/address/${level3BountyVault.trim()}`)
                      : null
                }
                onCopy={
                  level3State?.bountyVault || level3BountyVault.trim()
                    ? () => {
                        void onCopy(
                          "level3-bounty",
                          level3State?.bountyVault ?? level3BountyVault.trim()
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Reward acct"
                value={
                  level3UserRewardAccount.trim() || level3State?.rewardAccount
                }
                copied={copied === "level3-reward"}
                explorerUrl={
                  isAddress(level3UserRewardAccount.trim())
                    ? getExplorerUrl(
                        `/address/${level3UserRewardAccount.trim()}`
                      )
                    : null
                }
                onCopy={
                  level3UserRewardAccount.trim()
                    ? () => {
                        void onCopy(
                          "level3-reward",
                          level3UserRewardAccount.trim()
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Mercenary"
                value={level3ExternalProgram.trim() || null}
                copied={copied === "level3-external"}
                explorerUrl={
                  isAddress(level3ExternalProgram.trim())
                    ? getExplorerUrl(`/address/${level3ExternalProgram.trim()}`)
                    : null
                }
                onCopy={
                  level3ExternalProgram.trim()
                    ? () => {
                        void onCopy(
                          "level3-external",
                          level3ExternalProgram.trim()
                        );
                      }
                    : undefined
                }
              />
              <StatusTextRow
                label="Status"
                value={
                  delegated
                    ? "Guild bounty drained"
                    : "Awaiting delegated exploit"
                }
              />
              <AddressRow
                label="Asset"
                value={certificate?.minted ? certificate.assetId : null}
                copied={copied === "level3-asset"}
                explorerUrl={
                  certificate?.minted && certificate.assetId
                    ? getExplorerUrl(`/address/${certificate.assetId}`)
                    : null
                }
                onCopy={
                  certificate?.minted && certificate.assetId
                    ? () => {
                        void onCopy("level3-asset", certificate.assetId!);
                      }
                    : undefined
                }
              />
            </div>
          </div>

          {status === "connected" && isLoading ? (
            <div className="mt-5 space-y-3">
              <SkeletonLine className="h-12" />
              <SkeletonLine className="h-28" />
            </div>
          ) : null}

          {status === "connected" && level3Error ? (
            <div className="mt-5 rounded-[22px] border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground">
                Could not read Level 3 state
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {level3Error instanceof Error
                  ? level3Error.message
                  : "The selected cluster returned an unexpected Level 3 account response."}
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
                className="min-h-13 w-full rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSending ? "Submitting..." : stage.actionLabel}
              </button>
            ) : (
              <div className="rounded-full border border-border bg-card px-4 py-3 text-center text-sm text-muted">
                {level3Completed
                  ? "The exploit is verified. Mint can unlock from here."
                  : "Connect a wallet to unlock the exploit actions."}
              </div>
            )}

            <button
              onClick={onMint}
              disabled={!level3Completed || certificate?.minted || isMinting}
              className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted"
            >
              {certificate?.minted
                ? "Level 3 cNFT minted"
                : isMinting
                  ? "Minting cNFT..."
                  : level3Completed
                    ? "Mint Level 3 cNFT"
                    : "Mint locked"}
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Exploit note
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <ChecklistItem text="Unchecked external programs are arbitrary code execution in disguise once valuable signer privileges are forwarded." />
            <ChecklistItem text="This exploit needs an attacker program because the malicious behavior happens inside the delegated CPI target, not in the original client transaction alone." />
            <ChecklistItem text="Verification only cares that your reward account received the bounty amount and that the per-player Level 3 state exists to close." />
          </div>
        </div>
      </aside>
    </div>
  );
}
