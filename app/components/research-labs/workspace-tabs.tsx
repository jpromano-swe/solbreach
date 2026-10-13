"use client";

import { Code2, Play, ScrollText, ShieldCheck } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import type { ExecuteExploitView, WorkspaceTab } from "./types";

const RESEARCH_LAB_TRANSITION_MS = 180;

export const RESEARCH_LAB_TAB_TRANSITION_ORDER = [
  "inspect",
  "exploit",
  "report",
] satisfies Array<WorkspaceTab | ExecuteExploitView>;

export const EXECUTE_EXPLOIT_VIEW_TRANSITION_ORDER = [
  "HYPOTHESIS",
  "EVIDENCE_REVIEW",
] satisfies Array<WorkspaceTab | ExecuteExploitView>;

export function AnimatedContentSwitch({
  children,
  className = "",
  transitionOrder,
  transitionKey,
}: {
  children: ReactNode;
  className?: string;
  transitionOrder?: string[];
  transitionKey: string;
}) {
  const previousKeyRef = useRef(transitionKey);
  const previousNodeRef = useRef(children);
  const timeoutRef = useRef<number | null>(null);
  const [exitingNode, setExitingNode] = useState<{
    key: string;
    node: ReactNode;
  } | null>(null);
  const [direction, setDirection] = useState<"forward" | "backward" | "vertical">(
    "vertical"
  );

  useEffect(() => {
    if (previousKeyRef.current !== transitionKey) {
      const previousIndex = transitionOrder?.indexOf(previousKeyRef.current) ?? -1;
      const nextIndex = transitionOrder?.indexOf(transitionKey) ?? -1;
      const nextDirection =
        previousIndex >= 0 && nextIndex >= 0
          ? nextIndex > previousIndex
            ? "forward"
            : "backward"
          : "vertical";

      setDirection(nextDirection);
      setExitingNode({
        key: previousKeyRef.current,
        node: previousNodeRef.current,
      });
      previousKeyRef.current = transitionKey;

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setExitingNode(null);
      }, RESEARCH_LAB_TRANSITION_MS);
    }

    previousNodeRef.current = children;
  }, [children, transitionKey, transitionOrder]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  return (
    <div
      className={`research-lab-transition-stack ${className}`}
      data-direction={direction}
      style={
        {
          "--research-lab-transition-ms": `${RESEARCH_LAB_TRANSITION_MS}ms`,
        } as CSSProperties
      }
    >
      {exitingNode ? (
        <div
          key={`exit-${exitingNode.key}`}
          className="research-lab-transition-exit"
          aria-hidden="true"
        >
          {exitingNode.node}
        </div>
      ) : null}
      <div key={transitionKey} className="research-lab-transition-current">
        {children}
      </div>
    </div>
  );
}

export function WorkspaceTabs({
  activeTab,
  availableTabs,
  onTabChange,
}: {
  activeTab: WorkspaceTab;
  availableTabs: WorkspaceTab[];
  onTabChange: (tab: WorkspaceTab) => void;
}) {
  const tabs: Array<{ id: WorkspaceTab; label: string; icon: ReactNode }> = [
    { id: "inspect", label: "Inspect", icon: <Code2 className="h-4 w-4" /> },
    { id: "exploit", label: "Execute Exploit", icon: <Play className="h-4 w-4" /> },
    { id: "verify", label: "Evidence Review", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "report", label: "Report Finding", icon: <ScrollText className="h-4 w-4" /> },
  ];

  return (
    <div className="flex items-center justify-between border-b border-white/10 px-4">
      <div className="flex min-w-0 overflow-x-auto">
        {tabs
          .filter((tab) => availableTabs.includes(tab.id))
          .map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b px-4 py-4 text-sm transition ${
                activeTab === tab.id
                  ? "border-[#9945ff] text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
      </div>
    </div>
  );
}
