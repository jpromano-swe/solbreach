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

type StepState = "idle" | "active" | "done";

type Level1Snapshot = {
  bankPda: Address;
  level1StatePda: Address;
  hasBank: boolean;
  expectedMint: Address | null;
  hasLevel1State: boolean;
  depositedAmount: bigint;
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

const LEVEL_1_TARGET = 1_000_000n;

export function Level1Panel({
  address,
  certificate,
  copied,
  getExplorerUrl,
  isLoading,
  isMinting,
  isSending,
  level1Amount,
  level1Completed,
  level1Error,
  level1ExpectedMint,
  level1State,
  level1UserTokenAccount,
  level1Vault,
  onChangeAmount,
  onChangeExpectedMint,
  onChangeUserTokenAccount,
  onChangeVault,
  onCopy,
  onDeposit,
  onInitBank,
  onInitLevel1,
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
  level1Amount: string;
  level1Completed: boolean;
  level1Error: unknown;
  level1ExpectedMint: string;
  level1State?: Level1Snapshot;
  level1UserTokenAccount: string;
  level1Vault: string;
  onChangeAmount: (value: string) => void;
  onChangeExpectedMint: (value: string) => void;
  onChangeUserTokenAccount: (value: string) => void;
  onChangeVault: (value: string) => void;
  onCopy: (label: string, value: string) => Promise<void>;
  onDeposit: () => Promise<void>;
  onInitBank: () => Promise<void>;
  onInitLevel1: () => Promise<void>;
  onMint: () => void;
  onVerify: () => Promise<void>;
  stage: StageConfig;
  status: string;
}) {
  const depositState = level1Completed
    ? "done"
    : level1State?.depositedAmount
      ? "active"
      : "idle";
  const verifyState: StepState = level1Completed
    ? "done"
    : (level1State?.depositedAmount ?? 0n) >= LEVEL_1_TARGET
      ? "active"
      : "idle";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <BriefCard
            eyebrow="Operator level"
            title="The vault trusts the account wrapper, not the mint inside it."
            body="This bank only checks that both token accounts are valid SPL accounts. It never constrains the vault's mint, so a fake mint can satisfy the transfer and still inflate the internal ledger."
          />
          <BriefCard
            eyebrow="Local operator flow"
            title="Provision the fake mint off-screen, then use the board to submit it."
            body="Create the fake mint, fake vault, and user token account with your operator keypair. The page should only coordinate the vulnerable instruction and the verify step, not hide the exploit mechanics."
          />
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                Exploit pipeline
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Configure the bank, open your per-player Level 1 state, then
                point the vulnerable deposit at a fake mint. The mint control
                stays dead until the on-chain verifier closes the level.
              </p>
            </div>
            <Pill>{stage.badge}</Pill>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SequenceCard
              index="01"
              title="Bank"
              body="Set the expected stable mint once."
              state={
                level1Completed || level1State?.hasBank ? "done" : "active"
              }
            />
            <SequenceCard
              index="02"
              title="Instance"
              body="Open your Level 1 PDA."
              state={
                level1Completed
                  ? "done"
                  : level1State?.hasLevel1State
                    ? "done"
                    : level1State?.hasBank
                      ? "active"
                      : "idle"
              }
            />
            <SequenceCard
              index="03"
              title="Deposit"
              body="Route fake tokens into the bank."
              state={depositState}
            />
            <SequenceCard
              index="04"
              title="Verify"
              body="Close the level and unlock mint."
              state={verifyState}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TestingField
              label="Expected mint"
              value={level1ExpectedMint}
              onChange={onChangeExpectedMint}
              placeholder="Legit mint stored in the bank config"
            />
            <TestingField
              label="Vault token account"
              value={level1Vault}
              onChange={onChangeVault}
              placeholder="Fake vault token account address"
            />
            <TestingField
              label="User token account"
              value={level1UserTokenAccount}
              onChange={onChangeUserTokenAccount}
              placeholder="Fake user token account owned by the signer"
            />
            <TestingField
              label="Raw amount"
              value={level1Amount}
              onChange={onChangeAmount}
              placeholder="1000000"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button
              onClick={() => {
                void onInitBank();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize bank
            </button>
            <button
              onClick={() => {
                void onInitLevel1();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Initialize level
            </button>
            <button
              onClick={() => {
                void onDeposit();
              }}
              disabled={isSending}
              className="min-h-12 rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            >
              Submit exploit deposit
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
              label="Target"
              value={`${(level1State?.depositedAmount ?? 0n).toString()} / ${LEVEL_1_TARGET.toString()}`}
            />
            <div className="mt-3 h-1.5 rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-300"
                style={{
                  width: `${Math.min(
                    Number(
                      ((level1State?.depositedAmount ?? 0n) * 100n) /
                        LEVEL_1_TARGET
                    ),
                    100
                  )}%`,
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
                  void onCopy("level1-wallet", address);
                }}
                className="min-h-10 rounded-full border border-border px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {copied === "level1-wallet" ? "Done" : "Copy wallet"}
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
                copied={copied === "level1-wallet-address"}
                explorerUrl={
                  address ? getExplorerUrl(`/address/${address}`) : null
                }
                onCopy={
                  address
                    ? () => {
                        void onCopy("level1-wallet-address", address);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Bank"
                value={level1State?.bankPda}
                copied={copied === "level1-bank"}
                explorerUrl={
                  level1State?.bankPda
                    ? getExplorerUrl(`/address/${level1State.bankPda}`)
                    : null
                }
                onCopy={
                  level1State?.bankPda
                    ? () => {
                        void onCopy("level1-bank", level1State.bankPda);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Level1"
                value={level1State?.level1StatePda}
                copied={copied === "level1-pda"}
                explorerUrl={
                  level1State?.level1StatePda
                    ? getExplorerUrl(`/address/${level1State.level1StatePda}`)
                    : null
                }
                onCopy={
                  level1State?.level1StatePda
                    ? () => {
                        void onCopy("level1-pda", level1State.level1StatePda);
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Certificate"
                value={certificate?.certificatePda}
                copied={copied === "level1-certificate"}
                explorerUrl={
                  certificate?.certificatePda
                    ? getExplorerUrl(`/address/${certificate.certificatePda}`)
                    : null
                }
                onCopy={
                  certificate?.certificatePda
                    ? () => {
                        void onCopy(
                          "level1-certificate",
                          certificate.certificatePda
                        );
                      }
                    : undefined
                }
              />
              <AddressRow
                label="Mint"
                value={
                  level1State?.expectedMint ??
                  (level1ExpectedMint.trim() ? level1ExpectedMint.trim() : null)
                }
                copied={copied === "level1-mint"}
                explorerUrl={
                  level1State?.expectedMint
                    ? getExplorerUrl(`/address/${level1State.expectedMint}`)
                    : isAddress(level1ExpectedMint.trim())
                      ? getExplorerUrl(`/address/${level1ExpectedMint.trim()}`)
                      : null
                }
                onCopy={
                  level1State?.expectedMint || level1ExpectedMint.trim()
                    ? () => {
                        void onCopy(
                          "level1-mint",
                          level1State?.expectedMint ?? level1ExpectedMint.trim()
                        );
                      }
                    : undefined
                }
              />
              <StatusTextRow
                label="Ledger"
                value={`${(level1State?.depositedAmount ?? 0n).toString()} credited`}
              />
              <AddressRow
                label="Asset"
                value={certificate?.minted ? certificate.assetId : null}
                copied={copied === "level1-asset"}
                explorerUrl={
                  certificate?.minted && certificate.assetId
                    ? getExplorerUrl(`/address/${certificate.assetId}`)
                    : null
                }
                onCopy={
                  certificate?.minted && certificate.assetId
                    ? () => {
                        void onCopy("level1-asset", certificate.assetId!);
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

          {status === "connected" && level1Error ? (
            <div className="mt-5 rounded-[22px] border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground">
                Could not read Level 1 state
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {level1Error instanceof Error
                  ? level1Error.message
                  : "The selected cluster returned an unexpected Level 1 account response."}
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
                {level1Completed
                  ? "The exploit is verified. Mint can unlock from here."
                  : "Connect a wallet to unlock the exploit actions."}
              </div>
            )}

            <button
              onClick={onMint}
              disabled={!level1Completed || certificate?.minted || isMinting}
              className="min-h-13 w-full rounded-full border border-border bg-card px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-accent disabled:text-muted"
            >
              {certificate?.minted
                ? "Level 1 cNFT minted"
                : isMinting
                  ? "Minting cNFT..."
                  : level1Completed
                    ? "Mint Level 1 cNFT"
                    : "Mint locked"}
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-background/75 p-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Exploit note
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <ChecklistItem text="The fake vault account can point to a completely different mint than the bank expects." />
            <ChecklistItem text="The user token account still has to belong to the connected signer or the Anchor owner constraint will stop the transfer." />
            <ChecklistItem text="Verification only cares that the internal ledger hit 1,000,000, not whether the bank received the right asset." />
          </div>
        </div>
      </aside>
    </div>
  );
}
