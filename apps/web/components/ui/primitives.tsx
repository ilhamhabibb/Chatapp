import type { InputHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string | undefined;
  as?: "div" | "section" | "aside" | "article" | undefined;
}) {
  return (
    <Tag className={`rounded-card border border-hairline bg-surface ${className}`}>{children}</Tag>
  );
}

export function CardHeader({
  title,
  icon,
  action,
}: {
  title: ReactNode;
  icon?: ReactNode | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
      <div className="flex items-center gap-2 text-heading">
        {icon}
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

const fieldControl =
  "w-full rounded-field bg-inset px-3 py-2.5 text-body placeholder:text-faint focus:border-accent focus:outline-none";

type FieldProps = {
  label: string;
  hint?: string | undefined;
  children: (id: string) => ReactNode;
};

export function Field({ label, hint, children }: FieldProps) {
  const id = `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-caps">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldControl} ${className}`} />;
}
