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

type Level2Snapshot = {
  profilePda: Address;
  level2StatePda: Address;
  hasProfile: boolean;
  commander: Address | null;
  hasLevel2State: boolean;
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

export function Level2Panel({
  address,
  certificate,
  copied,
  getExplorerUrl,
  isLoading,
  isMinting,
  isSending,
  level2Completed,
  level2Error,
  level2InitialCommander,
  level2State,
  onChangeInitialCommander,
  onCopy,
  onInitGlobalProfile,
  onInitLevel2,
  onMint,
  onUpdateProfile,
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
  level2Completed: boolean;
  level2Error: unknown;
  level2InitialCommander: string;
  level2State?: Level2Snapshot;
  onChangeInitialCommander: (value: string) => void;
  onCopy: (label: string, value: string) => Promise<void>;
  onInitGlobalProfile: () => Promise<void>;
  onInitLevel2: () => Promise<void>;
  onMint: () => void;
  onUpdateProfile: () => Promise<void>;
  onVerify: () => Promise<void>;
  stage: StageConfig;
  status: string;
}) {
  const commanderCaptured = Boolean(
    address && level2State?.commander === address
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <BriefCard
            eyebrow="Static PDA"
            title="The profile locker is global, not personal."
            body="The architect forgot to include the user's pubkey in the seeds, so everyone points at the same registry PDA. Once the profile exists, any signer can overwrite the commander field."
          />
          <BriefCard
            eyebrow="Local operator flow"
            title="Bootstrap the commander, then replace it with your own wallet."
            body="Use the board to initialize the shared profile once, open your per-player state, then submit the overwrite. Verification should only pass once the global commander equals the connected wallet."
          />
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Exploit pipeline
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Bootstrap the shared commander profile, open your player state,
                overwrite the single global record, then verify the hijack and
                close your instance.
              </p>
            </div>
            <Pill>{stage.badge}</Pill>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SequenceCard
              index="01"
              title="Profile"
              body="Initialize the global commander registry."
              state={
                level2Completed || level2State?.hasProfile ? "done" : "active"
              }
            />
            <SequenceCard
              index="02"
              title="Instance"
              body="Open your Level 2 PDA."
              state={
                level2Completed
                  ? "done"
                  : level2State?.hasLevel2State
                    ? "done"
                    : level2State?.hasProfile
                      ? "active"
                      : "idle"
              }
            />
            <SequenceCard
              index="03"
              title="Overwrite"
              body="Replace the global commander with yourself."
              state={
                level2Completed
                  ? "done"
                  : commanderCaptured
                    ? "done"
                    : level2State?.hasLevel2State
                      ? "active"
                      : "idle"
              }
            />
            <SequenceCard
              index="04"
              title="Verify"
              body="Close the instance and unlock mint."
              state={
                level2Completed ? "done" : commanderCaptured ? "active" : "idle"
              }
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <TestingField
            label="Initial commander"
            value={level2InitialCommander}
            onChange={onChangeInitialCommander}
            placeholder="Any non-player pubkey used to bootstrap the profile"
          />

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button
              onClick={() => {
                void onInitGlobalProfile();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize profile
            </button>
            <button
              onClick={() => {
                void onInitLevel2();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize level
            </button>
            <button
              onClick={() => {
                void onUpdateProfile();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Overwrite commander
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
                  void onCopy("level2-wallet", address);
                }}
                className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {copied === "level2-wallet" ? "Done" : "Copy wallet"}
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
                copied={copied === "level2-wallet-address"}
                explorerUrl={
                  address ? getExplorerUrl(`/address/${address}`) : null
                }
                onCopy={
                  address
                    ? () => {
                        void onCopy("level2-wallet-address", address);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Profile"
                value={level2State?.profilePda}
                copied={copied === "level2-profile"}
                explorerUrl={
                  level2State?.profilePda
                    ? getExplorerUrl(`/address/${level2State.profilePda}`)
                    : null
                }
                onCopy={
                  level2State?.profilePda
                    ? () => {
                        void onCopy("level2-profile", level2State.profilePda);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Level2"
                value={level2State?.level2StatePda}
                copied={copied === "level2-pda"}
                explorerUrl={
                  level2State?.level2StatePda
                    ? getExplorerUrl(`/address/${level2State.level2StatePda}`)
                    : null
                }
                onCopy={
                  level2State?.level2StatePda
                    ? () => {
                        void onCopy("level2-pda", level2State.level2StatePda);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Certificate"
                value={certificate?.certificatePda}
                copied={copied === "level2-certificate"}
                explorerUrl={
                  certificate?.certificatePda
                    ? getExplorerUrl(`/address/${certificate.certificatePda}`)
                    : null
                }
                onCopy={
                  certificate?.certificatePda
                    ? () => {
                        void onCopy(
                          "level2-certificate",
                          certificate.certificatePda
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Commander"
                value={
                  level2State?.commander ??
                  (level2InitialCommander.trim()
                    ? level2InitialCommander.trim()
                    : null)
                }
                copied={copied === "level2-commander"}
                explorerUrl={
                  level2State?.commander
                    ? getExplorerUrl(`/address/${level2State.commander}`)
                    : isAddress(level2InitialCommander.trim())
                      ? getExplorerUrl(
                          `/address/${level2InitialCommander.trim()}`
                        )
                      : null
                }
                onCopy={
                  level2State?.commander || level2InitialCommander.trim()
                    ? () => {
                        void onCopy(
                          "level2-commander",
                          level2State?.commander ??
                            level2InitialCommander.trim()
                        );
                      }
                    : undefined
                }
              />
              <StatusTextRow
                label="Status"
                value={
                  commanderCaptured
                    ? "Commander hijacked"
                    : "Awaiting overwrite"
                }
              />
              <AddressRow
                label="Asset"
                value={certificate?.minted ? certificate.assetId : null}
                copied={copied === "level2-asset"}
                explorerUrl={
                  certificate?.minted && certificate.assetId
                    ? getExplorerUrl(`/address/${certificate.assetId}`)
                    : null
                }
                onCopy={
                  certificate?.minted && certificate.assetId
                    ? () => {
                        void onCopy("level2-asset", certificate.assetId!);
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

          {status === "connected" && level2Error ? (
            <div className="mt-5 rounded-[22px] border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground">
                Could not read Level 2 state
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {level2Error instanceof Error
                  ? level2Error.message
                  : "The selected cluster returned an unexpected Level 2 account response."}
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
                {level2Completed
                  ? "The exploit is verified. Mint can unlock from here."
                  : "Connect a wallet to unlock the exploit actions."}
              </div>
            )}

            <button
              onClick={onMint}
              disabled={!level2Completed || certificate?.minted || isMinting}
              className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted"
            >
              {certificate?.minted
                ? "Level 2 cNFT minted"
                : isMinting
                  ? "Minting cNFT..."
                  : level2Completed
                    ? "Mint Level 2 cNFT"
                    : "Mint locked"}
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Exploit note
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <ChecklistItem text="The profile PDA is static, so every user points to the same account." />
            <ChecklistItem text="Validating the bump only proves the PDA is derived correctly, not that it belongs to this player." />
            <ChecklistItem text="Verification succeeds only once the global commander equals the connected wallet and the per-player state exists." />
          </div>
        </div>
      </aside>
    </div>
  );
}
