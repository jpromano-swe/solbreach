"use client";

import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Code2,
  Copy,
  Database,
  FileJson,
  History,
  RefreshCw,
  Search,
  TerminalSquare,
  WalletCards,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  getResearchLabExplorer,
  listResearchLabTransactions,
  type ResearchLabExplorerAccount,
  type ResearchLabExplorerSnapshot,
  type TransactionResult,
} from "../../lib/research-labs/lab-state";
import type { EnrichedTransactionResult } from "./types";

type ExplorerView = "overview" | "accounts" | "transactions" | "interface";
type SearchResult =
  | { kind: "program"; id: string; title: string; subtitle: string }
  | {
      kind: "account";
      id: string;
      title: string;
      subtitle: string;
      accountRef: string;
    }
  | {
      kind: "wallet";
      id: string;
      title: string;
      subtitle: string;
      accountRef: string;
    };

type ExplorerLabContext = {
  accountsDescription: string;
  emptyTransactionDescription: string;
  eyebrow: string;
  metric: {
    detail: string;
    label: string;
    value: string;
  };
};

const EXPLORER_VIEWS: Array<{
  id: ExplorerView;
  label: string;
  icon: typeof Boxes;
}> = [
  { id: "overview", label: "Overview", icon: Boxes },
  { id: "accounts", label: "Accounts", icon: Database },
  { id: "transactions", label: "Transactions", icon: History },
  { id: "interface", label: "Program Interface", icon: FileJson },
];

export function YieldHijackExplorer({
  accessToken,
  sessionId,
  txResults: providedTransactions,
  onClose,
  standalone = false,
}: {
  accessToken: string;
  sessionId: string;
  txResults?: EnrichedTransactionResult[];
  onClose?: () => void;
  standalone?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<ResearchLabExplorerSnapshot | null>(
    null
  );
  const [activeView, setActiveView] = useState<ExplorerView>("overview");
  const [selectedAccountRef, setSelectedAccountRef] = useState<string | null>(
    null
  );
  const [selectedTransactionRef, setSelectedTransactionRef] = useState<
    string | null
  >(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persistedTransactions, setPersistedTransactions] = useState<
    EnrichedTransactionResult[]
  >([]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const txResults = providedTransactions ?? persistedTransactions;

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSnapshot, transactionHistory] = await Promise.all([
        getResearchLabExplorer(accessToken, sessionId),
        providedTransactions === undefined
          ? listResearchLabTransactions(accessToken, sessionId)
          : Promise.resolve(null),
      ]);
      if (!nextSnapshot.enabled) {
        throw new Error(
          nextSnapshot.reason || "Explorer is not enabled for this lab."
        );
      }
      setSnapshot(nextSnapshot);
      if (transactionHistory) {
        setPersistedTransactions(
          (transactionHistory.transactions ?? [])
            .map(normalizeExplorerTransaction)
            .reverse()
        );
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, providedTransactions, sessionId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadSnapshot();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadSnapshot]);

  useEffect(() => {
    if (!onClose) return;
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const selectedAccount =
    snapshot?.accounts.find((account) => account.ref === selectedAccountRef) ??
    null;
  const selectedTransaction =
    txResults.find(
      (transaction) =>
        explorerTransactionRef(transaction) === selectedTransactionRef
    ) ?? null;

  const searchResults = useMemo(
    () => buildSearchResults(snapshot, query),
    [query, snapshot]
  );

  const selectSearchResult = (result: SearchResult) => {
    setQuery("");
    if (result.kind === "program") {
      setActiveView("interface");
      setSelectedAccountRef(null);
      return;
    }
    setActiveView("accounts");
    setSelectedAccountRef(result.accountRef);
  };

  const openAccount = (accountRef: string) => {
    setActiveView("accounts");
    setSelectedAccountRef(accountRef);
  };

  const openTransaction = (transactionRef: string) => {
    setActiveView("transactions");
    setSelectedTransactionRef(transactionRef);
  };

  return (
    <div
      className={
        standalone
          ? "min-h-screen bg-[#121313] text-zinc-100"
          : "pointer-events-none fixed inset-0 z-[100] text-zinc-100"
      }
    >
      <section
        className={
          standalone
            ? "min-h-screen bg-[#121313]"
            : "pointer-events-auto absolute inset-0 overflow-y-auto bg-[#121313] shadow-2xl shadow-black/50 xl:inset-y-4 xl:left-auto xl:right-4 xl:w-[68vw] xl:min-w-[820px] xl:max-w-[1120px] xl:rounded-2xl xl:border xl:border-white/15"
        }
        role={standalone ? undefined : "dialog"}
        aria-modal={standalone ? undefined : false}
        aria-label="SolBreach Explorer"
      >
        <header
          className={`sticky top-0 z-30 border-b border-white/10 bg-[#191a1a]/95 backdrop-blur-xl ${
            standalone ? "" : "xl:rounded-t-2xl"
          }`}
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center justify-between gap-3 lg:w-72">
              <button
                type="button"
                onClick={() => {
                  setSelectedAccountRef(null);
                  setSelectedTransactionRef(null);
                  setActiveView("overview");
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-1 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#191a1a]"
                aria-label="Open explorer overview"
              >
                <Image
                  src="/logo_crop.png"
                  alt="SolBreach"
                  width={112}
                  height={35}
                  className="h-7 w-auto object-contain"
                  priority
                />
                <span className="border-l border-white/10 pl-2 text-xs font-semibold tracking-wide text-zinc-300">
                  Explorer
                </span>
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#9945ff]/30 bg-[#9945ff]/12 px-2 py-1 text-[10px] font-semibold text-[#d7c0ff] lg:hidden">
                <CircleDot className="h-3 w-3" aria-hidden="true" />
                SVM
              </span>
            </div>

            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <label htmlFor="research-lab-explorer-search" className="sr-only">
                Search program, accounts, or wallet addresses
              </label>
              <input
                id="research-lab-explorer-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults[0]) {
                    selectSearchResult(searchResults[0]);
                  }
                }}
                placeholder="Search program, accounts, or wallet addresses"
                autoComplete="off"
                className="h-11 w-full rounded-lg border border-white/10 bg-[#242525] pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#9945ff]/45 focus-visible:ring-2 focus-visible:ring-[#14f195]/70"
              />
              {query.trim() ? (
                <SearchResults
                  query={query}
                  results={searchResults}
                  onSelect={selectSearchResult}
                />
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
              <span className="hidden items-center gap-1.5 rounded-md border border-[#9945ff]/30 bg-[#9945ff]/12 px-2.5 py-1.5 text-[10px] font-semibold text-[#d7c0ff] lg:inline-flex">
                <CircleDot className="h-3 w-3" aria-hidden="true" />
                SolBreach SVM
              </span>
              <button
                type="button"
                onClick={() => void loadSnapshot()}
                disabled={loading}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#191a1a] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Refresh explorer data"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {onClose ? (
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-red-400/25 hover:bg-red-500/8 hover:text-red-200 focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#191a1a]"
                  aria-label="Close explorer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-7xl flex-col px-4 py-5 lg:flex-row lg:gap-6">
          <nav
            className="mb-5 flex gap-1 overflow-x-auto border-b border-white/10 pb-2 lg:mb-0 lg:w-48 lg:shrink-0 lg:flex-col lg:border-b-0 lg:pb-0"
            aria-label="Explorer sections"
          >
            {EXPLORER_VIEWS.map((view) => {
              const Icon = view.icon;
              const active = activeView === view.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => {
                    setActiveView(view.id);
                    setSelectedAccountRef(null);
                    setSelectedTransactionRef(null);
                  }}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium focus-visible:ring-2 focus-visible:ring-[#14f195] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121313] ${
                    active
                      ? "bg-[#9945ff]/14 text-[#d7c0ff]"
                      : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {view.label}
                </button>
              );
            })}
          </nav>

          <main className="min-w-0 flex-1">
            {loading && !snapshot ? (
              <ExplorerLoading />
            ) : error ? (
              <ExplorerError message={error} onRetry={loadSnapshot} />
            ) : snapshot ? (
              selectedAccount ? (
                <AccountDetail
                  account={selectedAccount}
                  candidateWallet={candidateWalletForAccount(
                    snapshot,
                    selectedAccount
                  )}
                  onBack={() => setSelectedAccountRef(null)}
                />
              ) : selectedTransaction ? (
                <TransactionDetail
                  transaction={selectedTransaction}
                  onBack={() => setSelectedTransactionRef(null)}
                />
              ) : activeView === "overview" ? (
                <ExplorerOverview
                  snapshot={snapshot}
                  txResults={txResults}
                  onOpenAccount={openAccount}
                  onOpenTransaction={openTransaction}
                  onViewChange={setActiveView}
                />
              ) : activeView === "accounts" ? (
                <AccountsTable
                  snapshot={snapshot}
                  onOpenAccount={openAccount}
                />
              ) : activeView === "transactions" ? (
                <TransactionsTable
                  snapshot={snapshot}
                  txResults={txResults}
                  onOpenTransaction={openTransaction}
                />
              ) : (
                <ProgramInterface snapshot={snapshot} />
              )
            ) : null}
          </main>
        </div>
      </section>
    </div>
  );
}

function SearchResults({
  query,
  results,
  onSelect,
}: {
  query: string;
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
}) {
  return (
    <div className="absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-lg border border-white/10 bg-[#222323] shadow-2xl shadow-black/40">
      {results.length ? (
        <div className="max-h-80 overflow-y-auto py-1">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => onSelect(result)}
              className="flex min-h-14 w-full items-center gap-3 px-3 text-left hover:bg-white/[0.05] focus-visible:bg-[#9945ff]/12 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#14f195]"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/20 text-zinc-500">
                {result.kind === "program" ? (
                  <Code2 className="h-4 w-4" aria-hidden="true" />
                ) : result.kind === "wallet" ? (
                  <WalletCards className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Database className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-200">
                  {result.title}
                </span>
                <span className="mt-0.5 block truncate font-mono text-xs text-zinc-500">
                  {result.subtitle}
                </span>
              </span>
              <ChevronRight
                className="ml-auto h-4 w-4 shrink-0 text-zinc-600"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium text-zinc-300">
            No explorer result
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            No program, account, or decoded wallet matches “{query}”.
          </p>
        </div>
      )}
    </div>
  );
}

function ExplorerOverview({
  snapshot,
  txResults,
  onOpenAccount,
  onOpenTransaction,
  onViewChange,
}: {
  snapshot: ResearchLabExplorerSnapshot;
  txResults: EnrichedTransactionResult[];
  onOpenAccount: (accountRef: string) => void;
  onOpenTransaction: (transactionRef: string) => void;
  onViewChange: (view: ExplorerView) => void;
}) {
  const context = getExplorerLabContext(snapshot);

  return (
    <div>
      <ExplorerHeading
        eyebrow={context.eyebrow}
        title="Program Overview"
        description="Inspect the session program, decoded accounts, and transaction history inside the SolBreach SVM."
      />

      <section className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#202121]">
        <div className="flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-500">Program</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100">
              {humanize(snapshot.program.name)}
            </h2>
            <CopyableAddress address={snapshot.program.address} />
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-[#14f195]/25 bg-[#14f195]/8 px-2 py-1 text-[11px] font-medium text-[#8fffd0]">
            <Check className="h-3 w-3" aria-hidden="true" />
            Session verified
          </span>
        </div>
        <dl className="grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <OverviewMetric
            label="Network"
            value={snapshot.network.name}
            detail={snapshot.network.kind}
          />
          <OverviewMetric
            label="Visible accounts"
            value={String(snapshot.accounts.length)}
            detail="learner-safe projection"
          />
          <OverviewMetric
            label={context.metric.label}
            value={context.metric.value}
            detail={context.metric.detail}
          />
        </dl>
      </section>

      {snapshot.participants?.length ? (
        <section className="mt-5 min-w-0">
          <SectionHeader
            title="Pool participants"
            actionLabel="View accounts"
            onAction={() => onViewChange("accounts")}
          />
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {snapshot.participants.map((participant) => (
              <button
                key={participant.ref}
                type="button"
                onClick={() => onOpenAccount(participant.ref)}
                className="min-h-24 rounded-lg border border-white/10 bg-[#202121] px-3 py-3 text-left transition hover:border-[#14f195]/25 hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-[#14f195]"
              >
                <span className="block text-xs font-semibold text-zinc-300">
                  {participant.label}
                </span>
                <span className="mt-2 block truncate font-mono text-xs text-[#9bdbff]">
                  {shortAddress(participant.walletAddress, 6)}
                </span>
                <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-zinc-600">
                  <WalletCards className="h-3 w-3" aria-hidden="true" />
                  Decoded wallet
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="min-w-0">
          <SectionHeader
            title="Program accounts"
            actionLabel="View all"
            onAction={() => onViewChange("accounts")}
          />
          <div className="mt-2 max-w-full overflow-x-auto rounded-lg border border-white/10 bg-[#202121]">
            <AccountsTableRows
              accounts={snapshot.accounts.slice(0, 6)}
              onOpenAccount={onOpenAccount}
              compact
            />
          </div>
        </section>

        <section className="min-w-0">
          <SectionHeader
            title="Recent transactions"
            actionLabel="View all"
            onAction={() => onViewChange("transactions")}
          />
          <div className="mt-2 max-w-full overflow-hidden rounded-lg border border-white/10 bg-[#202121]">
            {txResults.length ? (
              txResults.slice(0, 5).map((transaction) => {
                const transactionRef = explorerTransactionRef(transaction);
                return (
                  <button
                    key={transactionRef}
                    type="button"
                    onClick={() => onOpenTransaction(transactionRef)}
                    className="flex min-h-16 w-full items-center gap-3 border-b border-white/8 px-3 text-left last:border-b-0 hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#14f195]"
                  >
                    <TransactionStatus
                      successful={transaction.executionStatus === "success"}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-200">
                        {humanize(transaction.instructionType)}
                      </span>
                      <span className="mt-1 block truncate font-mono text-xs text-[#9bdbff]">
                        {shortAddress(transactionRef, 7)}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 text-zinc-600"
                      aria-hidden="true"
                    />
                  </button>
                );
              })
            ) : (
              <EmptyState
                icon={History}
                title="No transactions yet"
                description={context.emptyTransactionDescription}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AccountsTable({
  snapshot,
  onOpenAccount,
}: {
  snapshot: ResearchLabExplorerSnapshot;
  onOpenAccount: (accountRef: string) => void;
}) {
  const context = getExplorerLabContext(snapshot);

  return (
    <div>
      <ExplorerHeading
        eyebrow="Session accounts"
        title="Accounts"
        description={context.accountsDescription}
      />
      <div className="mt-5 overflow-x-auto rounded-lg border border-white/10 bg-[#202121]">
        <AccountsTableRows
          accounts={snapshot.accounts}
          onOpenAccount={onOpenAccount}
        />
      </div>
    </div>
  );
}

function AccountsTableRows({
  accounts,
  onOpenAccount,
  compact = false,
}: {
  accounts: ResearchLabExplorerAccount[];
  onOpenAccount: (accountRef: string) => void;
  compact?: boolean;
}) {
  return (
    <table
      className={`w-full text-left ${
        compact ? "min-w-[400px] sm:min-w-[480px]" : "min-w-[720px]"
      }`}
    >
      <thead className="border-b border-white/10 bg-black/10 text-[11px] uppercase tracking-wider text-zinc-600">
        <tr>
          <th className="px-3 py-3 font-medium">Account</th>
          <th className="px-3 py-3 font-medium">Type</th>
          {!compact ? (
            <th className="px-3 py-3 font-medium">Owner program</th>
          ) : null}
          {!compact ? (
            <th className="px-3 py-3 text-right font-medium">Lamports</th>
          ) : null}
          <th className="w-10 px-2 py-3">
            <span className="sr-only">Open account</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/8">
        {accounts.map((account) => (
          <tr key={account.ref} className="hover:bg-white/[0.025]">
            <td className="px-3 py-3">
              <button
                type="button"
                onClick={() => onOpenAccount(account.ref)}
                className="block min-h-10 max-w-72 text-left focus-visible:ring-2 focus-visible:ring-[#14f195]"
              >
                <span className="block text-sm font-medium text-[#9bdbff] hover:underline">
                  {account.label}
                </span>
                <span className="mt-1 block truncate font-mono text-xs text-zinc-500">
                  {shortAddress(account.address, 8)}
                </span>
              </button>
            </td>
            <td className="px-3 py-3 text-sm text-zinc-300">
              {account.accountType}
            </td>
            {!compact ? (
              <td className="px-3 py-3 font-mono text-xs text-zinc-500">
                {shortAddress(account.ownerProgram, 7)}
              </td>
            ) : null}
            {!compact ? (
              <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-zinc-400">
                {formatAmount(account.lamports)}
              </td>
            ) : null}
            <td className="px-2 py-3">
              <button
                type="button"
                onClick={() => onOpenAccount(account.ref)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-600 hover:bg-white/[0.05] hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-[#14f195]"
                aria-label={`Open ${account.label}`}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AccountDetail({
  account,
  candidateWallet,
  onBack,
}: {
  account: ResearchLabExplorerAccount;
  candidateWallet: string | null;
  onBack: () => void;
}) {
  return (
    <div>
      <BackButton label="All accounts" onClick={onBack} />
      <ExplorerHeading
        eyebrow={account.accountType}
        title={account.label}
        description={account.ref}
      />
      <div className="mt-3">
        <CopyableAddress address={account.address} full />
      </div>

      <section className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#202121]">
        <dl className="grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <OverviewMetric
            label="Balance"
            value={`${formatAmount(account.lamports)} lamports`}
            detail="sandbox account"
          />
          <OverviewMetric
            label="Account type"
            value={account.accountType}
            detail={account.ref}
          />
          <OverviewMetric
            label="Owner program"
            value={shortAddress(account.ownerProgram, 7)}
            detail="program authority"
          />
        </dl>
      </section>

      <section className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#202121]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Decoded data</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Fields decoded from the lab program interface.
          </p>
        </div>
        <dl className="divide-y divide-white/8">
          {Object.entries(account.data).map(([key, value]) => (
            <DecodedField
              key={key}
              field={key}
              value={value}
              emphasize={
                candidateWallet !== null &&
                typeof value === "string" &&
                value === candidateWallet
              }
            />
          ))}
        </dl>
      </section>
    </div>
  );
}

function DecodedField({
  field,
  value,
  emphasize,
}: {
  field: string;
  value: unknown;
  emphasize: boolean;
}) {
  const isAddress = typeof value === "string" && value.length >= 32;
  const isStructured = value !== null && typeof value === "object";

  return (
    <div
      className={`grid gap-2 px-4 py-3 sm:grid-cols-[220px_minmax(0,1fr)] ${
        emphasize ? "bg-[#14f195]/6" : ""
      }`}
    >
      <dt className="font-mono text-xs text-zinc-500">{field}</dt>
      <dd className="min-w-0 font-mono text-xs text-zinc-200">
        {isAddress ? (
          <CopyableAddress address={value} full emphasize={emphasize} />
        ) : isStructured ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-black/20 p-3 text-[11px] leading-5 text-zinc-400">
            {JSON.stringify(value, null, 2)}
          </pre>
        ) : (
          <span className="break-all">{formatExplorerValue(value)}</span>
        )}
      </dd>
    </div>
  );
}

function TransactionsTable({
  snapshot,
  txResults,
  onOpenTransaction,
}: {
  snapshot: ResearchLabExplorerSnapshot;
  txResults: EnrichedTransactionResult[];
  onOpenTransaction: (transactionRef: string) => void;
}) {
  const context = getExplorerLabContext(snapshot);

  return (
    <div>
      <ExplorerHeading
        eyebrow="Session history"
        title="Transactions"
        description="Inspect submitted actions, execution status, inputs, account deltas, and program logs."
      />
      <div className="mt-5 overflow-x-auto rounded-lg border border-white/10 bg-[#202121]">
        {txResults.length ? (
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-white/10 bg-black/10 text-[11px] uppercase tracking-wider text-zinc-600">
              <tr>
                <th className="px-3 py-3 font-medium">Signature</th>
                <th className="px-3 py-3 font-medium">Result</th>
                <th className="px-3 py-3 font-medium">Instruction</th>
                <th className="px-3 py-3 font-medium">Target</th>
                <th className="px-3 py-3 font-medium">Time</th>
                <th className="w-10 px-2 py-3">
                  <span className="sr-only">Open transaction</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {txResults.map((transaction) => {
                const transactionRef = explorerTransactionRef(transaction);
                return (
                  <tr key={transactionRef} className="hover:bg-white/[0.025]">
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenTransaction(transactionRef)}
                        className="min-h-10 font-mono text-xs text-[#9bdbff] hover:underline focus-visible:ring-2 focus-visible:ring-[#14f195]"
                      >
                        {shortAddress(transactionRef, 8)}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <StatusLabel
                        successful={transaction.executionStatus === "success"}
                      />
                    </td>
                    <td className="px-3 py-3 text-sm text-zinc-300">
                      {humanize(transaction.instructionType)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-500">
                      {transactionTargetLabel(transaction)}
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">
                      {formatTimestamp(
                        transaction.submittedAt ?? transaction.submitted_at
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenTransaction(transactionRef)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-600 hover:bg-white/[0.05] hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-[#14f195]"
                        aria-label={`Open transaction ${transactionRef}`}
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={History}
            title="No transactions yet"
            description={context.emptyTransactionDescription}
          />
        )}
      </div>
    </div>
  );
}

function TransactionDetail({
  transaction,
  onBack,
}: {
  transaction: EnrichedTransactionResult;
  onBack: () => void;
}) {
  const transactionRef = explorerTransactionRef(transaction);
  const deltas = transaction.accountDeltas ?? transaction.account_deltas ?? [];

  return (
    <div>
      <BackButton label="All transactions" onClick={onBack} />
      <ExplorerHeading
        eyebrow="Transaction details"
        title={humanize(transaction.instructionType)}
        description={shortAddress(transactionRef, 12)}
      />

      <section className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#202121]">
        <dl className="divide-y divide-white/8">
          <DetailRow
            label="Signature"
            value={<CopyableAddress address={transactionRef} full />}
          />
          <DetailRow
            label="Result"
            value={
              <StatusLabel
                successful={transaction.executionStatus === "success"}
              />
            }
          />
          <DetailRow
            label="Time"
            value={formatTimestamp(
              transaction.submittedAt ?? transaction.submitted_at
            )}
          />
          <DetailRow
            label="Submitted instruction"
            value={
              transaction.inputs.instructionName ? (
                <code className="font-mono text-xs text-[#c7a6ff]">
                  {transaction.inputs.instructionName}
                </code>
              ) : (
                "—"
              )
            }
          />
          {transaction.inputs.targetWalletAddress ? (
            <DetailRow
              label="Target wallet"
              value={
                <CopyableAddress
                  address={transaction.inputs.targetWalletAddress}
                  full
                />
              }
            />
          ) : null}
          {transaction.inputs.delegateProgramRef ? (
            <DetailRow
              label="CPI target"
              value={
                <code className="font-mono text-xs text-[#c7a6ff]">
                  {humanize(
                    transaction.inputs.delegateProgramLabel ??
                      transaction.inputs.delegateProgramRef
                  )}
                </code>
              }
            />
          ) : null}
          {transaction.inputs.destinationAccountRef ? (
            <DetailRow
              label="Destination account"
              value={humanize(
                transaction.inputs.destinationAccountLabel ??
                  transaction.inputs.destinationAccountRef
              )}
            />
          ) : null}
        </dl>
      </section>

      <section className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#202121]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Account state changes
          </h2>
        </div>
        {deltas.length ? (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-6 text-zinc-400">
            {JSON.stringify(deltas, null, 2)}
          </pre>
        ) : (
          <p className="px-4 py-6 text-sm text-zinc-500">
            No account deltas were recorded for this transaction.
          </p>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#202121]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <TerminalSquare
            className="h-4 w-4 text-[#14f195]"
            aria-hidden="true"
          />
          <h2 className="text-sm font-semibold text-zinc-100">Program logs</h2>
        </div>
        {transaction.logs.length ? (
          <ol className="divide-y divide-white/5 px-4 py-2 font-mono text-xs leading-6">
            {transaction.logs.map((log, index) => (
              <li key={`${index}-${log}`} className="flex gap-3 py-1.5">
                <span className="w-6 shrink-0 text-right text-zinc-700">
                  {index + 1}
                </span>
                <span
                  className={
                    transaction.executionStatus === "success"
                      ? "text-zinc-400"
                      : "text-red-300"
                  }
                >
                  {log}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-4 py-6 text-sm text-zinc-500">
            No program logs were recorded.
          </p>
        )}
      </section>
    </div>
  );
}

function ProgramInterface({
  snapshot,
}: {
  snapshot: ResearchLabExplorerSnapshot;
}) {
  const [expandedInstruction, setExpandedInstruction] = useState<string | null>(
    null
  );
  const instructions = idlItems(snapshot.program.idl, "instructions");
  const accountTypes = idlItems(snapshot.program.idl, "types");
  const errors = idlItems(snapshot.program.idl, "errors");

  return (
    <div>
      <ExplorerHeading
        eyebrow="Public IDL"
        title={humanize(snapshot.program.name)}
        description={`Version ${snapshot.program.version} · ${snapshot.program.interfaceSource}`}
      />
      <div className="mt-3">
        <CopyableAddress address={snapshot.program.address} full />
      </div>

      <section className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#202121]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Instructions</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Public callable functions decoded from the lab IDL.
          </p>
        </div>
        <div className="divide-y divide-white/8">
          {instructions.map((instruction, index) => {
            const name =
              stringFromUnknown(instruction.name) || `instruction_${index}`;
            const expanded = expandedInstruction === name;
            return (
              <div key={name}>
                <div className="flex items-center hover:bg-white/[0.025]">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedInstruction(expanded ? null : name)
                    }
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#14f195]"
                    aria-expanded={expanded}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#9945ff]/25 bg-[#9945ff]/10 text-[#c7a6ff]">
                      <Code2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-sm font-semibold text-zinc-200">
                        {name}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {idlArray(instruction, "accounts").length} accounts ·{" "}
                        {idlArray(instruction, "args").length} arguments
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-zinc-600 ${
                        expanded ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <CopyTextButton
                    value={name}
                    label={`Copy ${name} instruction`}
                    successMessage="Instruction copied"
                    className="mr-2"
                  />
                </div>
                {expanded ? (
                  <div className="border-t border-white/8 bg-black/15 px-4 py-4">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <IdlList
                        title="Input accounts"
                        items={idlArray(instruction, "accounts")}
                      />
                      <IdlList
                        title="Arguments"
                        items={idlArray(instruction, "args")}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <IdlSummary title="Account layouts" items={accountTypes} />
        <IdlSummary title="Custom errors" items={errors} />
      </div>
    </div>
  );
}

function IdlList({
  title,
  items,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
        {title}
      </p>
      {items.length ? (
        <div className="mt-2 space-y-2">
          {items.map((item, index) => (
            <div
              key={`${stringFromUnknown(item.name)}-${index}`}
              className="rounded-md border border-white/8 bg-white/[0.02] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-zinc-300">
                  {stringFromUnknown(item.name) || `item_${index}`}
                </span>
                <span className="font-mono text-[11px] text-zinc-600">
                  {formatIdlType(item.type)}
                </span>
              </div>
              {item.pda ? (
                <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-[#c7a6ff]">
                  PDA seeds: {JSON.stringify(item.pda)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-zinc-600">None</p>
      )}
    </div>
  );
}

function IdlSummary({
  title,
  items,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#202121]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      </div>
      {items.length ? (
        <div className="divide-y divide-white/8">
          {items.map((item, index) => (
            <div
              key={`${stringFromUnknown(item.name)}-${index}`}
              className="flex min-h-12 items-center justify-between gap-3 px-4 py-2"
            >
              <span className="font-mono text-xs text-zinc-300">
                {stringFromUnknown(item.name) || `item_${index}`}
              </span>
              <span className="font-mono text-[11px] text-zinc-600">
                {item.code !== undefined
                  ? String(item.code)
                  : formatIdlType(item.type)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-zinc-500">None declared.</p>
      )}
    </section>
  );
}

function ExplorerHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c7a6ff]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function OverviewMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="px-4 py-4">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 font-mono text-sm font-semibold text-zinc-100">
        {value}
      </dd>
      <p className="mt-1 text-[11px] text-zinc-600">{detail}</p>
    </div>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-[#9bdbff] hover:underline focus-visible:ring-2 focus-visible:ring-[#14f195]"
      >
        {actionLabel}
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-sm text-zinc-200">{value}</dd>
    </div>
  );
}

function CopyableAddress({
  address,
  full = false,
  emphasize = false,
}: {
  address: string;
  full?: boolean;
  emphasize?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy address");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copyAddress()}
      className={`mt-1 inline-flex min-h-10 max-w-full items-center gap-2 rounded-md font-mono text-xs focus-visible:ring-2 focus-visible:ring-[#14f195] ${
        emphasize ? "text-[#8fffd0]" : "text-[#9bdbff]"
      }`}
      title={address}
    >
      <span className={full ? "break-all text-left" : "truncate"}>
        {full ? address : shortAddress(address, 9)}
      </span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="sr-only">Copy address</span>
    </button>
  );
}

function CopyTextButton({
  value,
  label,
  successMessage,
  className = "",
}: {
  value: string;
  label: string;
  successMessage: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(successMessage);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy value");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copyValue()}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-[#14f195] ${className}`}
      aria-label={label}
      title={label}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

function StatusLabel({ successful }: { successful: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${
        successful
          ? "border-[#14f195]/25 bg-[#14f195]/8 text-[#8fffd0]"
          : "border-red-400/25 bg-red-500/8 text-red-200"
      }`}
    >
      {successful ? (
        <Check className="h-3 w-3" aria-hidden="true" />
      ) : (
        <X className="h-3 w-3" aria-hidden="true" />
      )}
      {successful ? "Success" : "Rejected"}
    </span>
  );
}

function TransactionStatus({ successful }: { successful: boolean }) {
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
        successful
          ? "border-[#14f195]/25 bg-[#14f195]/8 text-[#14f195]"
          : "border-red-400/25 bg-red-500/8 text-red-300"
      }`}
    >
      {successful ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </span>
  );
}

function BackButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-md text-sm text-zinc-500 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-[#14f195]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Boxes;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
      <Icon className="h-8 w-8 text-zinc-700" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-zinc-300">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function ExplorerLoading() {
  return (
    <div aria-busy="true" aria-label="Loading explorer">
      <div className="h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-3 h-8 w-64 animate-pulse rounded bg-white/[0.07]" />
      <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded bg-white/[0.05]" />
      <div className="mt-6 h-52 animate-pulse rounded-lg border border-white/8 bg-white/[0.025]" />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-lg border border-white/8 bg-white/[0.025]" />
        <div className="h-72 animate-pulse rounded-lg border border-white/8 bg-white/[0.025]" />
      </div>
    </div>
  );
}

function ExplorerError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-red-400/20 bg-red-500/6 p-5">
      <div className="flex items-center gap-2 text-red-200">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <p className="text-sm font-semibold">Could not load the explorer</p>
      </div>
      <p className="mt-2 text-sm text-zinc-400">{message}</p>
      <button
        type="button"
        onClick={() => void onRetry()}
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[#14f195]"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function buildSearchResults(
  snapshot: ResearchLabExplorerSnapshot | null,
  query: string
): SearchResult[] {
  if (!snapshot) return [];
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const results: SearchResult[] = [];
  const programHaystack = [
    snapshot.program.name,
    snapshot.program.ref,
    snapshot.program.address,
  ]
    .join(" ")
    .toLowerCase();
  if (programHaystack.includes(normalized)) {
    results.push({
      kind: "program",
      id: `program-${snapshot.program.address}`,
      title: humanize(snapshot.program.name),
      subtitle: snapshot.program.address,
    });
  }

  for (const account of snapshot.accounts) {
    const haystack = [
      account.ref,
      account.label,
      account.address,
      account.ownerProgram,
      account.accountType,
      JSON.stringify(account.data),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(normalized)) continue;
    results.push({
      kind: "account",
      id: `account-${account.ref}`,
      title: account.label,
      subtitle: `${account.accountType} · ${account.address}`,
      accountRef: account.ref,
    });
  }

  for (const candidate of snapshot.rewardCandidates ?? []) {
    if (!candidate.walletAddress.toLowerCase().includes(normalized)) continue;
    const account = snapshot.accounts.find(
      (entry) => entry.ref === candidate.positionRef
    );
    if (!account) continue;
    results.push({
      kind: "wallet",
      id: `wallet-${candidate.walletAddress}`,
      title: "Decoded position owner",
      subtitle: candidate.walletAddress,
      accountRef: account.ref,
    });
  }

  return results.slice(0, 8);
}

function candidateWalletForAccount(
  snapshot: ResearchLabExplorerSnapshot,
  account: ResearchLabExplorerAccount
) {
  const rewardCandidates = snapshot.rewardCandidates ?? [];
  const directCandidate = rewardCandidates.find(
    (candidate) => candidate.positionRef === account.ref
  );
  if (directCandidate) return directCandidate.walletAddress;

  const walletAddress = stringFromUnknown(account.data.walletAddress);
  if (!walletAddress) return null;
  return rewardCandidates.some(
    (candidate) => candidate.walletAddress === walletAddress
  )
    ? walletAddress
    : null;
}

function getExplorerLabContext(
  snapshot: ResearchLabExplorerSnapshot
): ExplorerLabContext {
  const isArbitraryCpi =
    snapshot.program.ref === "task_bounty" ||
    snapshot.accounts.some((account) => account.ref === "task_escrow");

  if (isArbitraryCpi) {
    const protocolState =
      snapshot.protocolState ?? snapshot.protocol_state ?? {};
    const bountyPool = recordFromUnknown(protocolState.bountyPool);
    const paidOut = numberFromUnknown(bountyPool?.paidOut);

    return {
      accountsDescription:
        "Browse the public accounts exposed by the RL3 bounty program and inspect their decoded state.",
      emptyTransactionDescription:
        "Build, deployment, delegation, and CPI activity will appear here.",
      eyebrow: "RL3 / Arbitrary CPI",
      metric: {
        detail: "current session",
        label: "Bounty paid out",
        value: `${formatAmount(paidOut)} USDC`,
      },
    };
  }

  return {
    accountsDescription:
      "Browse the public accounts exposed by the RL2 staking program and inspect their decoded state.",
    emptyTransactionDescription:
      "Stake and reward-claim activity will appear here.",
    eyebrow: "RL2 / Yield Hijack",
    metric: {
      detail: "current session",
      label: "Rewards paid",
      value: `${formatAmount(snapshot.totalRewardsPaid ?? 0)} ${
        snapshot.rewardAsset?.symbol ?? "USDC"
      }`,
    },
  };
}

function transactionTargetLabel(transaction: EnrichedTransactionResult) {
  if (transaction.inputs.targetWalletAddress) {
    return shortAddress(transaction.inputs.targetWalletAddress, 6);
  }

  const target =
    transaction.inputs.delegateProgramLabel ??
    transaction.inputs.delegateProgramRef ??
    transaction.inputs.destinationAccountLabel ??
    transaction.inputs.destinationAccountRef;

  return target ? humanize(target) : "—";
}

function recordFromUnknown(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numberFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function idlItems(
  idl: Record<string, unknown>,
  key: string
): Array<Record<string, unknown>> {
  const value = idl[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === "object"
  );
}

function idlArray(
  record: Record<string, unknown>,
  key: string
): Array<Record<string, unknown>> {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === "object"
  );
}

function stringFromUnknown(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatIdlType(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return JSON.stringify(value);
  return "account";
}

function formatExplorerValue(value: unknown) {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return formatAmount(value);
  return String(value);
}

function normalizeExplorerTransaction(
  result: TransactionResult
): EnrichedTransactionResult {
  const parameters =
    result.parameters ?? result.parametersJson ?? result.parameters_json ?? {};
  const protocolState = result.protocolState ?? result.protocol_state;
  const rejectionCode = protocolState?.lastRejectedReason;
  const parameter = (key: string) => {
    const value = parameters[key];
    return typeof value === "string" && value.trim() ? value : undefined;
  };
  const amountValue = parameters.amount;
  const amount =
    typeof amountValue === "number"
      ? amountValue
      : typeof amountValue === "string" && Number.isFinite(Number(amountValue))
        ? Number(amountValue)
        : 0;
  const destinationAccountRef = parameter("destination_account_ref");
  const delegateProgramRef = parameter("delegate_program_ref");
  const taskRef = parameter("task_ref");

  return {
    ...result,
    instructionType: result.instructionType ?? result.instruction_type ?? "",
    executionStatus:
      result.executionStatus ?? result.execution_status ?? "failure",
    logs: result.logs ?? [],
    errorCode:
      result.errorCode ??
      result.error_code ??
      (typeof rejectionCode === "string" ? rejectionCode : undefined),
    inputs: {
      actionType: result.instructionType ?? result.instruction_type,
      sourceAccountRef: parameter("source_account_ref"),
      stakeVaultRef: parameter("stake_vault_ref"),
      positionAccountRef: parameter("position_account_ref"),
      rewardVaultRef: parameter("reward_vault_ref"),
      destinationAccountRef,
      destinationAccountLabel: destinationAccountRef
        ? humanize(destinationAccountRef)
        : undefined,
      instructionName: parameter("instruction_name"),
      targetWalletAddress: parameter("target_wallet_address"),
      programTemplate: parameter("program_template"),
      entrypointName: parameter("entrypoint_name"),
      transferSourceRef: parameter("transfer_source_ref"),
      transferDestinationRef: parameter("transfer_destination_ref"),
      authorityStrategy: parameter("authority_strategy"),
      artifactRef: parameter("artifact_ref"),
      taskRef,
      taskLabel: taskRef ? humanize(taskRef) : undefined,
      delegateProgramRef,
      delegateProgramLabel: delegateProgramRef
        ? humanize(delegateProgramRef)
        : undefined,
      rewardAmount: numberFromUnknown(parameters.reward_amount),
      amount,
    },
  };
}

function explorerTransactionRef(transaction: EnrichedTransactionResult) {
  return (
    transaction.transactionRef ||
    transaction.transaction_ref ||
    `${transaction.instructionType}-${transaction.submittedAt ?? transaction.submitted_at ?? "pending"}`
  );
}

function shortAddress(value: string, visible = 5) {
  if (value.length <= visible * 2 + 3) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimestamp(value?: string) {
  if (!value) return "Session time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "The session explorer could not be loaded.";
}
