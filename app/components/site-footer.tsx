"use client";

import Image from "next/image";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      {
        label: "Vulnerability Modules",
        href: "https://solbreach.gitbook.io/documentation/learning-model/vulnerability-module",
        external: true,
      },
      {
        label: "Research Labs",
        href: "https://solbreach.gitbook.io/documentation/learning-model/research-labs",
        external: true,
      },
      {
        label: "Breach Rooms",
        href: "https://solbreach.gitbook.io/documentation/learning-model/breach-rooms",
        external: true,
      },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Documentation", href: "", external: true },
      { label: "Beta Access", href: "/onboarding" },
    ],
  },
  {
    title: "Community",
    links: [
      {
        label: "solbreach_app",
        href: "https://x.com/solbreach_app",
        external: true,
      },
      {
        label: "GitHub",
        href: "https://github.com/jpromano-swe/solbreach",
        external: true,
      },
    ],
  },
];

export function SiteFooter({ documentationUrl }: { documentationUrl: string }) {
  const columns = FOOTER_COLUMNS.map((column) =>
    column.title === "Company"
      ? {
          ...column,
          links: column.links.map((link) =>
            link.label === "Documentation"
              ? { ...link, href: documentationUrl }
              : link,
          ),
        }
      : column,
  );

  return (
    <footer className="relative border-t border-border/70 bg-[#08090a]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 pb-14 pt-36 md:grid-cols-[1.35fr_repeat(3,0.75fr)] sm:pt-40 lg:px-8">
        <div className="max-w-sm">
          <Image
            src="/logo_crop.png"
            alt="SolBreach"
            width={300}
            height={72}
            className="h-auto w-44 object-contain"
          />
          <p className="mt-5 text-sm leading-6 text-muted">
            Security training layer for Solana builders.
          </p>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-semibold text-foreground">
              {column.title}
            </h2>
            <ul
              className={
                column.title === "Community"
                  ? "mt-5 flex items-center gap-4"
                  : "mt-5 space-y-3 text-sm"
              }
            >
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className={
                      column.title === "Community"
                        ? "inline-flex min-h-10 min-w-10 items-center justify-center text-muted transition-colors hover:text-[#14f195] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        : "text-muted transition-colors hover:text-[#14f195] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    }
                    aria-label={
                      column.title === "Community" ? link.label : undefined
                    }
                  >
                    {column.title === "Community" ? (
                      link.label === "GitHub" ? (
                        <GitHubIcon className="h-5 w-5" />
                      ) : (
                        <XIcon className="h-5 w-5" />
                      )
                    ) : (
                      link.label
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="bg-[#08090a]">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="h-[2px] w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.24) 1px, transparent 1.6px)",
              backgroundRepeat: "repeat-x",
              backgroundSize: "16px 2px",
            }}
          />
        </div>
        <div className="mx-auto flex w-full max-w-7xl items-center px-6 py-6 text-sm text-muted lg:px-8">
          <p className="inline-flex items-center gap-1.5">
            <span>Built for</span>
            <Image
              src="/solana-sol-icon.png"
              alt="Solana"
              width={18}
              height={18}
              className="h-4 w-4 object-contain"
            />
            <span>by ZirconDioxide.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function GitHubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${className} fill-current`}
    >
      <path d="M12 2C6.477 2 2 6.59 2 12.252c0 4.53 2.865 8.37 6.839 9.727.5.096.682-.222.682-.494 0-.244-.009-.891-.014-1.75-2.782.617-3.369-1.37-3.369-1.37-.455-1.183-1.11-1.497-1.11-1.497-.908-.637.069-.624.069-.624 1.004.072 1.532 1.055 1.532 1.055.893 1.566 2.341 1.114 2.91.852.091-.664.35-1.115.636-1.371-2.221-.258-4.555-1.137-4.555-5.062 0-1.118.389-2.032 1.029-2.749-.103-.259-.446-1.301.098-2.713 0 0 .84-.276 2.75 1.05A9.327 9.327 0 0 1 12 6.863c.85.004 1.706.118 2.504.346 1.909-1.326 2.748-1.05 2.748-1.05.546 1.412.203 2.454.1 2.713.64.717 1.028 1.631 1.028 2.749 0 3.934-2.337 4.801-4.566 5.054.359.319.678.948.678 1.911 0 1.379-.012 2.49-.012 2.829 0 .274.18.594.688.493C19.138 20.619 22 16.78 22 12.252 22 6.59 17.523 2 12 2Z" />
    </svg>
  );
}

function XIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${className} fill-current`}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}
