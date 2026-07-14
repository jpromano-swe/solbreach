"use client";

import Image from "next/image";

export function SiteFooter({ documentationUrl }: { documentationUrl: string }) {
  return (
    <footer className="border-t border-border/70">
      <div className="flex w-full flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6 md:flex-row lg:px-8">
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
        <div className="flex items-center gap-2">
          <a
            href="https://x.com/solbreach_app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 px-2 text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Open SolBreach on X"
          >
            <XIcon />
            <span>solbreach_app</span>
          </a>
          <a
            href={documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 px-2 text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Open SolBreach documentation"
          >
            <GitHubIcon />
            <span>Documentation</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current"
    >
      <path d="M12 2C6.477 2 2 6.59 2 12.252c0 4.53 2.865 8.37 6.839 9.727.5.096.682-.222.682-.494 0-.244-.009-.891-.014-1.75-2.782.617-3.369-1.37-3.369-1.37-.455-1.183-1.11-1.497-1.11-1.497-.908-.637.069-.624.069-.624 1.004.072 1.532 1.055 1.532 1.055.893 1.566 2.341 1.114 2.91.852.091-.664.35-1.115.636-1.371-2.221-.258-4.555-1.137-4.555-5.062 0-1.118.389-2.032 1.029-2.749-.103-.259-.446-1.301.098-2.713 0 0 .84-.276 2.75 1.05A9.327 9.327 0 0 1 12 6.863c.85.004 1.706.118 2.504.346 1.909-1.326 2.748-1.05 2.748-1.05.546 1.412.203 2.454.1 2.713.64.717 1.028 1.631 1.028 2.749 0 3.934-2.337 4.801-4.566 5.054.359.319.678.948.678 1.911 0 1.379-.012 2.49-.012 2.829 0 .274.18.594.688.493C19.138 20.619 22 16.78 22 12.252 22 6.59 17.523 2 12 2Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}
