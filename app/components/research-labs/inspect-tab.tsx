"use client";

import dynamic from "next/dynamic";
import { FileCode2, FolderOpen } from "lucide-react";
import type { ReactNode } from "react";

import type { ResearchLabFile } from "../../lib/research-labs/lab-state";
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
  files,
  onSelectFile,
}: {
  accounts: AccountEvidence[];
  activeFile: ResearchLabFile | null;
  activeFileContent: string;
  files: ResearchLabFile[];
  onSelectFile: (path: string) => void;
}) {
  return (
    <div className="grid h-full min-w-0 lg:grid-cols-[minmax(0,1fr)_340px]">
      <CodeTab
        activeFile={activeFile}
        activeFileContent={activeFileContent}
        files={files}
        onSelectFile={onSelectFile}
      />
      <div className="min-h-0 border-t border-white/10 bg-black/10 lg:border-l lg:border-t-0">
        <AccountsTab accounts={accounts} compact />
      </div>
    </div>
  );
}

function CodeTab({
  activeFile,
  activeFileContent,
  files,
  onSelectFile,
}: {
  activeFile: ResearchLabFile | null;
  activeFileContent: string;
  files: ResearchLabFile[];
  onSelectFile: (path: string) => void;
}) {
  const shouldShowTree = files.length > 1;
  const displayedFileContent = formatInspectSnippetComment(activeFileContent);

  return (
    <div className={`grid h-full ${shouldShowTree ? "grid-cols-[280px_minmax(0,1fr)]" : "grid-cols-1"}`}>
      {shouldShowTree ? <FileTree activeFile={activeFile} files={files} onSelectFile={onSelectFile} /> : null}
      <div className="min-w-0 overflow-hidden">
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-400">
            <FileCode2 className="h-4 w-4 text-[#b892ff]" />
            <span className="truncate">{activeFile?.path ?? "No file selected"}</span>
          </div>
          <div className="ml-4 flex shrink-0 items-center gap-2 text-xs text-zinc-500">
            Read-only protocol source
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            {activeFile?.language ?? "rust"}
          </div>
        </div>
        <div className="h-[calc(100%-48px)]">
          {activeFile ? (
            <MonacoEditor
              theme="vs-dark"
              language={activeFile.language}
              path={activeFile.path}
              value={displayedFileContent}
              options={{
                readOnly: true,
                minimap: { enabled: false },
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

function formatInspectSnippetComment(content: string) {
  return content.replace(
    "// Credit the attacker's position based on the deposited amount",
    [
      "// The position is credited from the provided collateral account.",
      "// Review which assumptions this instruction makes about that account",
      "// before credit is assigned.",
    ].join("\n")
  );
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
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">Visible Files</p>
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

function TreeRow({ icon, label, depth }: { icon: ReactNode; label: string; depth: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-zinc-500" style={{ paddingLeft: 8 + depth * 12 }}>
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
        active ? "bg-[#9945ff]/18 text-white" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
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
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">Protocol State</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Inspect the accounts involved in the current hypothesis. State changes appear after backend verification.
        </p>
      </div>
      <div className={`grid gap-4 ${compact ? "grid-cols-1" : "xl:grid-cols-2 2xl:grid-cols-3"}`}>
        {accounts.map((account) => (
          <div key={account.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{account.label}</p>
                <p className="mt-1 font-mono text-xs text-zinc-500">{account.address}</p>
              </div>
              <span className="rounded-full border border-[#14f195]/20 bg-[#14f195]/8 px-2.5 py-1 text-[11px] text-[#8fffd0]">
                Visible
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <StateLine label="Owner" value={account.owner} />
              <StateLine label="Role" value={account.role} />
              {account.authority ? <StateLine label="Authority" value={account.authority} /> : null}
              {account.mint ? <StateLine label="Mint" value={account.mint} /> : null}
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              {account.state.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 py-1 text-xs">
                  <span className="text-zinc-500">{item.label}</span>
                  <span className="font-mono text-zinc-300">{item.after ?? item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StateLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate text-right font-mono text-xs text-zinc-300">{value}</span>
    </div>
  );
}
