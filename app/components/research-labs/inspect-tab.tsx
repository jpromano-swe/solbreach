"use client";

import dynamic from "next/dynamic";
import { ChevronDown, FileCode2, FolderOpen } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { OnMount } from "@monaco-editor/react";

import type {
  ResearchLabFile,
  ResearchLabManifest,
  SandboxAccountSummary,
} from "../../lib/research-labs/lab-state";
import { isYieldHijackLab } from "./lab-adapters";
import type { AccountEvidence } from "./types";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading source viewer...
      </div>
    ),
  }
);

export function InspectTab({
  accounts,
  activeFile,
  activeFileContent,
  evidenceAccounts,
  files,
  inspectHintRevealed,
  lab,
  onSelectFile,
}: {
  accounts: AccountEvidence[];
  activeFile: ResearchLabFile | null;
  activeFileContent: string;
  evidenceAccounts: SandboxAccountSummary[];
  files: ResearchLabFile[];
  inspectHintRevealed: boolean;
  lab: ResearchLabManifest;
  onSelectFile: (path: string) => void;
}) {
  const isYieldHijack = isYieldHijackLab(lab);

  return (
    <div className="grid h-full min-w-0 lg:grid-cols-[minmax(0,1fr)_340px]">
      <CodeTab
        activeFile={activeFile}
        activeFileContent={activeFileContent}
        files={files}
        inspectHintRevealed={inspectHintRevealed}
        lab={lab}
        onSelectFile={onSelectFile}
      />
      <div className="min-h-0 border-t border-white/10 bg-black/10 lg:border-l lg:border-t-0">
        {isYieldHijack ? (
          <YieldHijackAccountsTab accounts={evidenceAccounts} />
        ) : (
          <AccountsTab accounts={accounts} compact />
        )}
      </div>
    </div>
  );
}

function CodeTab({
  activeFile,
  activeFileContent,
  files,
  inspectHintRevealed,
  lab,
  onSelectFile,
}: {
  activeFile: ResearchLabFile | null;
  activeFileContent: string;
  files: ResearchLabFile[];
  inspectHintRevealed: boolean;
  lab: ResearchLabManifest;
  onSelectFile: (path: string) => void;
}) {
  const shouldShowTree = files.length > 1;
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const displayedFileContent = useMemo(
    () => formatInspectContent(activeFileContent, inspectHintRevealed, lab),
    [activeFileContent, inspectHintRevealed, lab]
  );
  const vulnerableRange = useMemo(
    () => getInspectSnippetRange(displayedFileContent, lab),
    [displayedFileContent, lab]
  );
  const applyVulnerableDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      inspectHintRevealed && vulnerableRange
        ? [
            {
              range: new monaco.Range(
                vulnerableRange.startLine,
                1,
                vulnerableRange.endLine,
                1
              ),
              options: {
                className: "research-lab-inspect-vulnerable-line",
                glyphMarginClassName: "research-lab-inspect-vulnerable-glyph",
                isWholeLine: true,
                overviewRuler: {
                  color: "#9945ff",
                  position: monaco.editor.OverviewRulerLane.Right,
                },
              },
            },
          ]
        : []
    );
  }, [inspectHintRevealed, vulnerableRange]);
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyVulnerableDecorations();
  };

  useEffect(() => {
    applyVulnerableDecorations();
  }, [applyVulnerableDecorations, displayedFileContent]);

  return (
    <div
      className={`grid h-full ${shouldShowTree ? "grid-cols-[280px_minmax(0,1fr)]" : "grid-cols-1"}`}
    >
      {shouldShowTree ? (
        <FileTree
          activeFile={activeFile}
          files={files}
          onSelectFile={onSelectFile}
        />
      ) : null}
      <div className="min-w-0 overflow-hidden">
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-400">
            <FileCode2 className="h-4 w-4 text-[#b892ff]" />
            <span className="truncate">
              {activeFile?.path ?? "No file selected"}
            </span>
          </div>
        </div>
        <div className="h-[calc(100%-48px)]">
          {activeFile ? (
            <MonacoEditor
              theme="vs-dark"
              language={activeFile.language}
              path={activeFile.path}
              value={displayedFileContent}
              onMount={handleEditorMount}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                glyphMargin: inspectHintRevealed,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                lineHeight: 22,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 18, bottom: 18 },
                renderLineHighlight: "line",
                overviewRulerBorder: false,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Select a protocol file to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inspectAnswerComment = [
  "// Vulnerable: this function trusts the caller-supplied collateral account amount",
  "// without proving that the token account mint equals ACCEPTED_COLLATERAL_MINT.",
].join("\n");

const inspectDefaultComment =
  "// Deposit collateral into the lending position.";

function formatInspectSnippetComment(
  content: string,
  inspectHintRevealed: boolean
) {
  const sanitizedContent = content
    .replace(
      /^[ \t]*\/\/ Vulnerable: this function trusts the caller-supplied collateral account amount\r?\n[ \t]*\/\/ without proving that the token account mint equals ACCEPTED_COLLATERAL_MINT\.\r?\n?/gm,
      ""
    )
    .replace(
      /^[ \t]*\/\/ The position is credited from the provided collateral account\.\r?\n[ \t]*\/\/ Review which assumptions this instruction makes about that account\r?\n[ \t]*\/\/ before credit is assigned\.\r?\n?/gm,
      ""
    )
    .replace(
      /^[ \t]*\/\/ Credit the attacker's position based on the deposited amount\r?\n?/gm,
      ""
    );

  return insertCommentBeforeDepositFunction(
    sanitizedContent,
    inspectHintRevealed ? inspectAnswerComment : inspectDefaultComment
  );
}

const yieldHijackHintComment =
  "// Review which identities are represented in this derivation.";

function formatInspectContent(
  content: string,
  inspectHintRevealed: boolean,
  lab: ResearchLabManifest
) {
  if (!isYieldHijackLab(lab)) {
    return formatInspectSnippetComment(content, inspectHintRevealed);
  }

  const sanitizedContent = content
    .replace(
      /^[ \t]*\/\/ (?:BUG|Vulnerable):.*(?:\r?\n[ \t]*\/\/.*)*\r?\n?/gim,
      ""
    )
    .replace(
      /^[ \t]*\/\/ Review which identities are represented in this derivation\.\r?\n?/gm,
      ""
    );

  if (!inspectHintRevealed) return sanitizedContent;

  const accountMarker = "#[account(";
  const markerIndex = sanitizedContent.indexOf(accountMarker);
  if (markerIndex === -1) return sanitizedContent;

  const lineStart = sanitizedContent.lastIndexOf("\n", markerIndex) + 1;
  return `${sanitizedContent.slice(0, lineStart)}${yieldHijackHintComment}\n${sanitizedContent.slice(lineStart)}`;
}

function insertCommentBeforeDepositFunction(content: string, comment: string) {
  const marker = "pub fn deposit_collateral";
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) return content;

  const lineStart = content.lastIndexOf("\n", markerIndex) + 1;
  return `${content.slice(0, lineStart)}${comment}\n${content.slice(lineStart)}`;
}

function getVulnerableSnippetRange(content: string) {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) =>
    line.includes("pub fn deposit_collateral")
  );
  if (startIndex === -1) return null;

  const endIndex = lines.findIndex(
    (line, index) => index > startIndex && line.trim() === "}"
  );

  return {
    startLine: startIndex + 1,
    endLine: endIndex === -1 ? startIndex + 6 : endIndex + 1,
  };
}

function getInspectSnippetRange(content: string, lab: ResearchLabManifest) {
  if (!isYieldHijackLab(lab)) return getVulnerableSnippetRange(content);

  const lines = content.split("\n");
  const seedStart = lines.findIndex((line) => line.includes("seeds = ["));
  if (seedStart === -1) return null;
  const positionLine = lines.findIndex(
    (line, index) =>
      index > seedStart && line.includes("Account<'info, StakePosition>")
  );

  return {
    startLine: seedStart + 1,
    endLine: positionLine === -1 ? seedStart + 6 : positionLine + 1,
  };
}

function FileTree({
  activeFile,
  files,
  onSelectFile,
}: {
  activeFile: ResearchLabFile | null;
  files: ResearchLabFile[];
  onSelectFile: (path: string) => void;
}) {
  return (
    <div className="border-r border-white/10 bg-black/15 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
        Visible Files
      </p>
      <div className="mt-4 space-y-1 text-sm">
        <TreeRow icon={<FolderOpen />} label="lab/" depth={0} />
        <TreeRow icon={<FolderOpen />} label="programs/" depth={1} />
        {files.map((file) => (
          <FileRow
            key={file.path}
            active={activeFile?.path === file.path}
            depth={file.path.includes("/") ? 2 : 1}
            file={file}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </div>
  );
}

function TreeRow({
  icon,
  label,
  depth,
}: {
  icon: ReactNode;
  label: string;
  depth: number;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-zinc-500"
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <span className="h-4 w-4">{icon}</span>
      {label}
    </div>
  );
}

function FileRow({
  file,
  active,
  depth,
  onSelectFile,
}: {
  file: ResearchLabFile;
  active: boolean;
  depth: number;
  onSelectFile: (path: string) => void;
}) {
  const label = file.path.split("/").at(-1) ?? file.path;
  return (
    <button
      type="button"
      onClick={() => onSelectFile(file.path)}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
        active
          ? "bg-[#9945ff]/18 text-white"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
      }`}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <FileCode2 className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function AccountsTab({
  accounts,
  compact = false,
}: {
  accounts: AccountEvidence[];
  compact?: boolean;
}) {
  return (
    <div className="h-full overflow-auto p-5">
      <div className="mb-5 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
          Protocol State
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Accounts involved in the program.
        </p>
      </div>
      <div
        className={`grid gap-4 ${compact ? "grid-cols-1" : "xl:grid-cols-2 2xl:grid-cols-3"}`}
      >
        {accounts.map((account) => (
          <div
            key={account.id}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {account.label}
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  {account.address}
                </p>
              </div>
              <span className="text-[11px] text-[#8fffd0]">Visible</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <StateLine label="Owner" value={account.owner} />
              <StateLine label="Role" value={account.role} />
              {account.authority ? (
                <StateLine label="Authority" value={account.authority} />
              ) : null}
              {account.mint ? (
                <StateLine label="Mint" value={account.mint} />
              ) : null}
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              {account.state.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 py-1 text-xs"
                >
                  <span className="text-zinc-500">{item.label}</span>
                  <span className="font-mono text-zinc-300">
                    {item.after ?? item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function YieldHijackAccountsTab({
  accounts,
}: {
  accounts: SandboxAccountSummary[];
}) {
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const position = findAccount(accounts, "stake_position");
  const pool = findAccount(accounts, "pool_config");
  const stakeVault = findAccount(accounts, "stake_vault");
  const rewardVault = findAccount(accounts, "reward_vault");
  const userStake = findAccount(accounts, "user_stake_account");
  const userReward = findAccount(accounts, "user_reward_account");
  const owner = stringFromData(position?.data, [
    "owner_label",
    "ownerLabel",
    "position_owner_label",
    "positionOwnerLabel",
    "owner",
  ]);
  const ownerKey = stringFromData(position?.data, [
    "owner_address",
    "ownerAddress",
    "position_owner",
    "positionOwner",
  ]);
  const positionAddress =
    stringFromData(position?.data, ["address", "pubkey", "pda"]) ??
    addressFromAccount(position);
  const existingStakerPositionAddress =
    stringFromData(position?.data, [
      "existing_staker_position_address",
      "existingStakerPositionAddress",
      "existing_staker_pda",
      "existingStakerPda",
    ]) ?? positionAddress;
  const userPositionAddress =
    stringFromData(position?.data, [
      "user_position_address",
      "userPositionAddress",
      "user_pda",
      "userPda",
    ]) ?? positionAddress;

  return (
    <div className="h-full overflow-auto p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
          Protocol State
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Accounts involved in the staking program.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <InspectStateGroup title="Protocol Overview">
          <InspectStateRow label="Advertised APY" value="2,500%" />
          <InspectStateRow
            label="Pool authority"
            value={shortAddress(
              stringFromData(pool?.data, ["authority", "pool_authority"]) ??
                "Unavailable"
            )}
          />
          <InspectStateRow
            label="Stake vault"
            value={`${formatTokenAmount(accountBalance(stakeVault, 50_000))} STAKE`}
          />
          <InspectStateRow
            label="Reward vault"
            value={`${formatTokenAmount(accountBalance(rewardVault, 500_000))} REWARD`}
          />
        </InspectStateGroup>

        <InspectStateGroup title="Staking Position">
          <div className="pb-2">
            <p className="text-sm font-semibold text-zinc-100">
              {friendlyPositionOwner(owner)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-zinc-600">
              {shortAddress(ownerKey ?? "Existing staker")}
            </p>
          </div>
          <InspectStateRow
            label="Staked amount"
            value={`${formatTokenAmount(numberFromData(position?.data, ["staked_amount", "stakedAmount", "amount"], 50_000))} STAKE`}
          />
          <InspectStateRow
            label="Pending rewards"
            value={`${formatTokenAmount(numberFromData(position?.data, ["pending_rewards", "pendingRewards", "rewards"], 12_500))} REWARD`}
          />
          <InspectStateRow
            label="Pool"
            value={shortAddress(
              stringFromData(position?.data, ["pool", "pool_config"]) ??
                addressFromAccount(pool)
            )}
          />
          <InspectStateRow
            label="Position"
            value={shortAddress(positionAddress)}
          />
        </InspectStateGroup>

        <InspectStateGroup title="Your Wallet">
          <InspectStateRow
            label="Stake balance"
            value={`${formatTokenAmount(accountBalance(userStake, 100))} STAKE`}
          />
          <InspectStateRow
            label="Reward balance"
            value={`${formatTokenAmount(accountBalance(userReward, 0))} REWARD`}
          />
        </InspectStateGroup>

        <div className="border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setComparisonOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-[#c7a6ff] transition hover:text-white"
          >
            Compare Position Derivations
            <ChevronDown
              className={`h-4 w-4 transition-transform ${comparisonOpen ? "rotate-180" : ""}`}
            />
          </button>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Compare how the protocol derives a staking position for each
            participant.
          </p>
          {comparisonOpen ? (
            <div className="mt-4 space-y-3 border-l border-[#9945ff]/30 pl-4">
              <DerivationRow
                label="Existing Staker Position"
                address={existingStakerPositionAddress}
              />
              <DerivationRow
                label="Your Position"
                address={userPositionAddress}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InspectStateGroup({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border-b border-white/10 pb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
        {title}
      </p>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function InspectStateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-mono text-zinc-300">{value}</span>
    </div>
  );
}

function DerivationRow({ address, label }: { address: string; label: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-300">{label}</p>
      <p className="mt-1 break-all font-mono text-[10px] leading-4 text-zinc-600">
        Address: {address || "Unavailable"}
      </p>
    </div>
  );
}

function findAccount(accounts: SandboxAccountSummary[], ref: string) {
  return accounts.find((account) => account.ref === ref);
}

function addressFromAccount(account: SandboxAccountSummary | undefined) {
  return (
    stringFromData(account?.data, ["address", "pubkey", "key"]) ??
    account?.owner ??
    "Unavailable"
  );
}

function accountBalance(
  account: SandboxAccountSummary | undefined,
  fallback: number
) {
  return numberFromData(
    account?.data,
    ["token_balance", "tokenBalance", "balance", "amount"],
    account?.lamports ?? fallback
  );
}

function stringFromData(
  data: Record<string, unknown> | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function numberFromData(
  data: Record<string, unknown> | undefined,
  keys: string[],
  fallback: number
) {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }
  return fallback;
}

function friendlyPositionOwner(value: string | null) {
  const normalized = value?.toLowerCase() ?? "";
  return normalized.includes("attacker") || normalized.includes("learner")
    ? "Your Wallet"
    : "Existing Staker";
}

function shortAddress(value: string) {
  if (!value || value === "Unavailable") return value;
  return value.length > 14
    ? `${value.slice(0, 6)}...${value.slice(-4)}`
    : value;
}

function formatTokenAmount(value: number) {
  return Math.max(0, value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function StateLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate text-right font-mono text-xs text-zinc-300">
        {value}
      </span>
    </div>
  );
}
