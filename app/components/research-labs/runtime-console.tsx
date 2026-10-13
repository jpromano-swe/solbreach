"use client";

import { ChevronDown, TerminalSquare } from "lucide-react";
import { useEffect, useRef } from "react";

export function RuntimeConsoleDrawer({
  compact = false,
  isOpen,
  isRunning,
  lines,
  onToggle,
}: {
  compact?: boolean;
  isOpen: boolean;
  isRunning: boolean;
  lines: string[];
  onToggle: () => void;
}) {
  return (
    <div className={`${compact ? "mt-3" : "mt-4"} overflow-hidden rounded-[20px] border border-white/10 bg-[#101112]/90 shadow-2xl shadow-black/25 backdrop-blur-xl`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
          <TerminalSquare className="h-4 w-4 text-[#14f195]" />
          {compact ? "Runtime Output" : "Console / Runtime Output"}
        </span>
        <span className="flex items-center gap-3 text-xs text-zinc-500">
          {isRunning ? "Streaming" : isOpen ? "Collapse" : "Expand"}
          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>
      {isOpen ? (
        <div className={`${compact ? "h-28" : "h-52"} border-t border-white/10 p-4`}>
          <LabTerminal lines={lines.length ? lines : ["Runtime output will appear after you submit an action or inspect transaction logs."]} />
        </div>
      ) : null}
    </div>
  );
}

function LabTerminal({ lines }: { lines: string[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const linesRef = useRef(lines);
  const terminalRef = useRef<{
    clear: () => void;
    writeln: (line: string) => void;
    dispose: () => void;
  } | null>(null);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    async function bootTerminal() {
      if (!containerRef.current) return;
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed || !containerRef.current) return;

      const terminal = new Terminal({
        convertEol: true,
        cursorBlink: false,
        disableStdin: true,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        lineHeight: 1.45,
        theme: {
          background: "#0c0d0e",
          foreground: "#d4d4d8",
          black: "#0a0a0a",
          blue: "#60a5fa",
          cyan: "#22d3ee",
          green: "#14f195",
          magenta: "#9945ff",
          red: "#fb7185",
          white: "#f4f4f5",
          yellow: "#f59e0b",
        },
      });
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(containerRef.current);
      fitAddon.fit();
      terminalRef.current = terminal;
      linesRef.current.forEach((line) => terminal.writeln(line));
      terminal.writeln("$ ");

      resizeObserver = new ResizeObserver(() => fitAddon.fit());
      resizeObserver.observe(containerRef.current);
    }

    bootTerminal();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.clear();
    lines.forEach((line) => terminal.writeln(line));
    terminal.writeln("$ ");
  }, [lines]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
}
