export type Status = "online" | "idle" | "dnd" | "offline";

const colors: Record<Status, string> = {
  online: "bg-online",
  idle: "bg-idle",
  dnd: "bg-dnd",
  offline: "bg-offline",
};

export function StatusDot({
  status,
  size = 10,
  className = "",
}: {
  status: Status;
  size?: number | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ring-2 ring-surface ${colors[status]} ${className}`}
      style={{ width: size, height: size }}
      title={status}
    />
  );
}
