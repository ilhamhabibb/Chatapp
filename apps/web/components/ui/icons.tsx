type IconProps = React.SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function HashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 9h14M5 15h14M10 4l-1.5 16M16 4l-1.5 16" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </svg>
  );
}

export function GamepadIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7.5 7h9a4.5 4.5 0 0 1 4.4 5.4l-.7 3.6a2.6 2.6 0 0 1-4.4 1.5L13.4 15h-2.8l-2.4 2.5a2.6 2.6 0 0 1-4.4-1.5l-.7-3.6A4.5 4.5 0 0 1 7.5 7Z" />
      <path d="M7 11.5v2M6 12.5h2M15.5 11.8h.01M17.6 13.6h.01" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12 20 4.5 15 20l-3.5-6.5L4.5 12Z" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 5.5V4.2A1.7 1.7 0 0 0 13.3 2.5H5.2A1.7 1.7 0 0 0 3.5 4.2v15.6a1.7 1.7 0 0 0 1.7 1.7h8.1a1.7 1.7 0 0 0 1.7-1.7v-1.3" />
      <path d="M9.5 12h11M17 8.5l3.5 3.5-3.5 3.5" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9.5" cy="8.5" r="3.2" />
      <path d="M3.5 19.5a6 6 0 0 1 12 0M16 5.6a3.2 3.2 0 0 1 0 5.9M17.5 14.4a6 6 0 0 1 3 5.1" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.2 12.3l2.5 2.5 5.1-5.4" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.6v4.8M12 16.2h.01" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 4h10v5.5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5v1.5A3 3 0 0 0 7 10.4M17 6h2.5v1.5a3 3 0 0 1-2.5 2.9M9.5 20h5M12 14.5V20" />
    </svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M13.5 2.5 4.8 13.2a.6.6 0 0 0 .5.95h4.3l-1.1 7.35 8.7-10.7a.6.6 0 0 0-.5-.95h-4.3l1.1-7.35Z" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 6.5V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15h1" />
    </svg>
  );
}
