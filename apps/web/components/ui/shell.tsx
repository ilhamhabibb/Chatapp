import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";
import { StatusDot, type Status } from "./status-dot";

export function BrandMark({ size = 36 }: { size?: number | undefined }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-squircle bg-accent text-on-accent"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.52}
        height={size * 0.52}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.5 11.3a8.2 8.2 0 0 1-12 7.2L3.5 20l1.5-4.8a8.2 8.2 0 1 1 15.5-3.9Z" />
        <path d="M8.6 10.2h6.8M8.6 13.6h4.2" />
      </svg>
    </span>
  );
}

export function Wordmark({ subtitle }: { subtitle?: string | undefined }) {
  return (
    <span className="flex min-w-0 flex-col leading-none">
      <span className="truncate font-display text-[15px] font-bold tracking-[-0.02em] text-heading">
        Chating Arena
      </span>
      {subtitle ? (
        <span className="truncate text-[11px] font-medium tracking-wide text-faint">{subtitle}</span>
      ) : null}
    </span>
  );
}

export function StatusPill({ status }: { status: Status }) {
  const labels: Record<Status, string> = {
    online: "Terhubung",
    idle: "Menganggur",
    dnd: "Sibuk",
    offline: "Terputus",
  };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-inset px-2.5 py-1 text-xs text-muted">
      <StatusDot status={status} />
      {labels[status]}
    </span>
  );
}

export function AppHeader({
  subtitle,
  status,
  actions,
}: {
  subtitle?: string | undefined;
  status?: Status | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-sidebar">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <BrandMark size={32} />
          <Wordmark subtitle={subtitle} />
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {status ? (
            <span className="hidden sm:inline-flex">
              <StatusPill status={status} />
            </span>
          ) : null}
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function PageShell({
  children,
  width = "wide",
}: {
  children: ReactNode;
  width?: "narrow" | "medium" | "wide" | undefined;
}) {
  const widths = {
    narrow: "max-w-md",
    medium: "max-w-2xl",
    wide: "max-w-[1400px]",
  } as const;

  return (
    <div className="min-h-dvh bg-surface">
      <div className={`mx-auto w-full ${widths[width]} px-4 py-8`}>{children}</div>
    </div>
  );
}
