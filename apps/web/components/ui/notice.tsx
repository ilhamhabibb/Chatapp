import type { ReactNode } from "react";
import { AlertIcon, CheckCircleIcon, ClockIcon } from "./icons";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  info: "bg-accent-soft text-heading",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

const icons: Record<Tone, ReactNode> = {
  info: <ClockIcon width={18} height={18} />,
  success: <CheckCircleIcon width={18} height={18} />,
  warning: <AlertIcon width={18} height={18} />,
  danger: <AlertIcon width={18} height={18} />,
};

export function Notice({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-field px-3.5 py-3 text-sm ${tones[tone]} ${className}`}
    >
      <span className="mt-0.5 shrink-0">{icons[tone]}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}
