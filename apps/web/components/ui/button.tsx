import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-field font-display font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-active",
  secondary: "bg-inset text-heading hover:bg-hover",
  subtle: "bg-transparent text-muted hover:bg-hover hover:text-heading",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-on-accent",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
  lg: "h-11 rounded-full px-7 text-[15px]",
};

export function buttonStyles({
  variant = "secondary",
  size = "md",
  className = "",
}: {
  variant?: Variant | undefined;
  size?: Size | undefined;
  className?: string | undefined;
} = {}) {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant | undefined;
  size?: Size | undefined;
};

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button {...props} className={buttonStyles({ variant, size, className })} />;
}
