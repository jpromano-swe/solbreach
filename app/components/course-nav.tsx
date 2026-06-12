import { useCallback, useState, type ComponentType } from "react";
import {
  ChevronDown,
  Cpu,
  FileCode2,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

export type CourseLevelTarget = "level0" | "level1" | "level2" | "level3";

type CourseMenuItem = {
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  target?: CourseLevelTarget;
  title: string;
};

type CourseMenuSection = {
  items: CourseMenuItem[];
  title: string;
};

const VULNERABILITY_MENU_SECTIONS: CourseMenuSection[] = [
  {
    title: "Application Level",
    items: [
      {
        icon: FileCode2,
        target: "level1",
        title: "The Illusionist",
        description: "Unchecked account validation and forged deposits",
      },
      {
        icon: ShieldCheck,
        target: "level2",
        title: "Identity Thief",
        description: "Static PDA seeds and shared profile authority",
      },
      {
        icon: Zap,
        target: "level3",
        title: "Trojan Horse",
        description: "Arbitrary CPI and delegated signer abuse",
      },
    ],
  },
  {
    title: "Supply Chain",
    items: [
      {
        icon: Cpu,
        title: "Dependency Takeover",
        description: "Malicious packages in build and deploy paths",
      },
      {
        icon: Sparkles,
        title: "CI Secret Exposure",
        description: "Leaked keys, tokens, and release credentials",
      },
      {
        icon: ShieldCheck,
        title: "Build Integrity",
        description: "Reproducible artifacts and trusted signers",
      },
    ],
  },
  {
    title: "Client and Wallet Side",
    items: [
      {
        icon: Send,
        title: "Transaction Spoofing",
        description: "Misleading prompts and unsafe message construction",
      },
      {
        icon: LockKeyhole,
        title: "Approval Drains",
        description: "Persistent permissions and hidden token movement",
      },
      {
        icon: Cpu,
        title: "Frontend Injection",
        description: "Compromised clients that rewrite wallet intent",
      },
    ],
  },
];

export function HeaderCourseNav({
  onSelectResearchLabs,
  onSelectVulnerabilities,
  onSelectLevel,
}: {
  onSelectResearchLabs: () => void;
  onSelectVulnerabilities: () => void;
  onSelectLevel: (level: CourseLevelTarget) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openCourseMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  return (
    <nav
      aria-label="Course sections"
      className="relative flex flex-wrap items-center justify-center gap-3 motion-safe:animate-[headerNavFade_180ms_ease-out]"
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      <HeaderMenuTrigger
        label="Vulnerabilities"
        open={isMenuOpen}
        onClick={() => {
          onSelectVulnerabilities();
          setIsMenuOpen(false);
        }}
        onMouseEnter={openCourseMenu}
      />
      <HeaderDirectButton
        label="Research Labs"
        onClick={onSelectResearchLabs}
      />
      <HeaderNavButton disabled label="Breach Rooms" locked />

      <div
        className={`absolute left-0 right-0 top-full h-4 ${
          isMenuOpen ? "block" : "hidden"
        }`}
        aria-hidden="true"
      />

      <div
        className={`absolute left-1/2 top-[calc(100%+0.35rem)] z-40 w-[min(calc(100vw-2rem),860px)] -translate-x-1/2 rounded-[22px] border border-border bg-card/98 p-2 shadow-[0_28px_90px_-54px_rgba(0,0,0,0.9)] backdrop-blur-xl motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:ease-out motion-reduce:transition-none ${
          isMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        onMouseEnter={() => setIsMenuOpen(true)}
      >
        <div className="relative overflow-hidden">
          <CourseMenuContent
            onClose={() => setIsMenuOpen(false)}
            onSelectLevel={onSelectLevel}
            sections={VULNERABILITY_MENU_SECTIONS}
          />
        </div>
      </div>
    </nav>
  );
}

function CourseMenuContent({
  onClose,
  onSelectLevel,
  sections,
}: {
  onClose: () => void;
  onSelectLevel: (level: CourseLevelTarget) => void;
  sections: CourseMenuSection[];
}) {
  return (
    <div
      className={`grid min-w-0 ${
        sections.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"
      }`}
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.title}
          className={`p-4 ${
            sectionIndex > 0
              ? "border-t border-border md:border-l md:border-t-0"
              : ""
          }`}
        >
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            {section.title}
          </p>
          <div className="space-y-2">
            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    if (item.target) {
                      onSelectLevel(item.target);
                    }

                    onClose();
                  }}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm">
                    <Icon className="h-4 w-4" aria-hidden={true} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function HeaderMenuTrigger({
  label,
  onClick,
  onMouseEnter,
  open,
}: {
  label: string;
  onClick: () => void;
  onMouseEnter: () => void;
  open: boolean;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        open
          ? "bg-foreground/5 text-foreground"
          : "text-muted hover:bg-foreground/5 hover:text-foreground"
      }`}
    >
      {label}
      <ChevronDown
        className={`h-3.5 w-3.5 opacity-70 transition-transform ${
          open ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

function HeaderDirectButton({
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
      className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {label}
    </button>
  );
}

function HeaderNavButton({
  disabled = false,
  label,
  locked = false,
}: {
  disabled?: boolean;
  label: string;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-4 text-sm font-medium text-muted/55 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {locked ? <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
