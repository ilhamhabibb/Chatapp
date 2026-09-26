const palette = [
  "#5865F2",
  "#EB459E",
  "#00A8FC",
  "#3BA55D",
  "#F0B232",
  "#B377F3",
  "#ED4245",
  "#15F5BA",
];

export function avatarColor(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }
  return palette[hash % palette.length] ?? "#5865F2";
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts.at(0);
  if (first === undefined) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts.at(-1) ?? first;
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function Avatar({
  name,
  seed,
  size = 36,
  className = "",
}: {
  name: string;
  seed?: string | undefined;
  size?: number | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: avatarColor(seed ?? name), fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
