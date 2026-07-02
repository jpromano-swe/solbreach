"use client";

import dynamic from "next/dynamic";
import { FileCode2, FolderOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { OnMount } from "@monaco-editor/react";

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
  inspectHintRevealed,
  onSelectFile,
}: {
  accounts: AccountEvidence[];
  activeFile: ResearchLabFile | null;
  activeFileContent: string;
  files: ResearchLabFile[];
  inspectHintRevealed: boolean;
  onSelectFile: (path: string) => void;
}) {
  return (
    <div className="grid h-full min-w-0 lg:grid-cols-[minmax(0,1fr)_340px]">
      <CodeTab
        activeFile={activeFile}
        activeFileContent={activeFileContent}
        files={files}
        inspectHintRevealed={inspectHintRevealed}
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
  inspectHintRevealed,
  onSelectFile,
}: {
  activeFile: ResearchLabFile | null;
  activeFileContent: string;
  files: ResearchLabFile[];
  inspectHintRevealed: boolean;
  onSelectFile: (path: string) => void;
}) {
  const shouldShowTree = files.length > 1;
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const displayedFileContent = useMemo(
    () => formatInspectSnippetComment(activeFileContent, inspectHintRevealed),
    [activeFileContent, inspectHintRevealed]
  );
  const vulnerableRange = useMemo(
    () => getVulnerableSnippetRange(displayedFileContent),
    [displayedFileContent]
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
                className: "rl1-inspect-vulnerable-line",
                glyphMarginClassName: "rl1-inspect-vulnerable-glyph",
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
    <div className={`grid h-full ${shouldShowTree ? "grid-cols-[280px_minmax(0,1fr)]" : "grid-cols-1"}`}>
      {shouldShowTree ? <FileTree activeFile={activeFile} files={files} onSelectFile={onSelectFile} /> : null}
      <div className="min-w-0 overflow-hidden">
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-400">
            <FileCode2 className="h-4 w-4 text-[#b892ff]" />
            <span className="truncate">{activeFile?.path ?? "No file selected"}</span>
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

function formatInspectSnippetComment(content: string, inspectHintRevealed: boolean) {
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
          Accounts involved in the program.
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
              <span className="text-[11px] text-[#8fffd0]">
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
