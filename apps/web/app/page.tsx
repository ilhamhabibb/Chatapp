import Link from "next/link";
import { Aura } from "../components/ui/aura";
import { AppHeader, BrandMark, Wordmark } from "../components/ui/shell";
import { buttonStyles } from "../components/ui/button";
import { Card } from "../components/ui/primitives";
import { StatusDot } from "../components/ui/status-dot";
import {
  BoltIcon,
  GamepadIcon,
  HashIcon,
  LockIcon,
  SendIcon,
  TrophyIcon,
  UsersIcon,
} from "../components/ui/icons";

const features = [
  {
    icon: BoltIcon,
    title: "Chat real-time",
    body: "Pesan masuk seketika lewat WebSocket, lengkap dengan indikator mengetik dan status koneksi di header.",
  },
  {
    icon: GamepadIcon,
    title: "Arena Skor 4 pemain",
    body: "Kumpulkan token dan hindari hazard selama 90 detik. Skor tertinggi menutup ronde.",
  },
  {
    icon: UsersIcon,
    title: "Room publik & privat",
    body: "Buka room publik supaya siapa pun bisa masuk, atau buat obrolan privat satu-on-satu.",
  },
];

const players = [
  { name: "Raka", score: 142, tokens: 12, status: "online" as const },
  { name: "Nadia", score: 118, tokens: 9, status: "online" as const },
  { name: "Bimo", score: 96, tokens: 7, status: "idle" as const },
];

const chatLines = [
  { who: "Raka", body: "gas, round 1 kapan mulai?", tone: "normal" as const },
  { who: "Nadia", body: "aku udah ready", tone: "normal" as const },
  { who: "System", body: "Bimo bergabung ke room", tone: "system" as const },
  { who: "Bimo", body: "tengah, nunggu host", tone: "normal" as const },
];

function RoomPreview() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-hairline bg-sidebar px-4 py-3">
        <HashIcon width={18} height={18} className="text-faint" />
        <span className="font-display text-sm font-semibold text-heading">mabar-malam</span>
        <span className="text-xs text-faint">4 anggota</span>
      </div>

      <ul className="flex flex-col gap-3.5 px-4 py-4">
        {chatLines.map((line) =>
          line.tone === "system" ? (
            <li key={line.body} className="rounded-field bg-inset px-3 py-2 text-xs text-muted">
              {line.body}
            </li>
          ) : (
            <li key={line.body} className="flex gap-2.5">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-[11px] font-bold text-accent-text">
                {line.who.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <span className="font-display text-[13px] font-semibold text-heading">{line.who}</span>
                <p className="text-[13px] leading-snug text-body">{line.body}</p>
              </div>
            </li>
          ),
        )}
      </ul>

      <div className="flex items-center gap-2 border-t border-hairline bg-sidebar px-3 py-3">
        <span className="flex-1 truncate rounded-field bg-inset px-3 py-2 text-[13px] text-faint">
          Kirim pesan...
        </span>
        <span className="flex size-8 items-center justify-center rounded-field bg-accent text-on-accent">
          <SendIcon width={16} height={16} />
        </span>
      </div>
    </Card>
  );
}

function ScoreRack() {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="label-caps">Papan skor</span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="size-1.5 rounded-full bg-idle" />
          00:42
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {players.map((player, index) => (
          <li
            key={player.name}
            className="flex items-center gap-2.5 rounded-field bg-inset px-3 py-2.5"
          >
            <span className="w-4 font-display text-xs font-bold text-faint">{index + 1}</span>
            <StatusDot status={player.status} />
            <span className="flex-1 truncate text-[13px] text-body">{player.name}</span>
            <span className="text-xs text-faint">{player.tokens} token</span>
            <span className="w-9 text-right font-display text-sm font-bold text-heading tabular-nums">
              {player.score}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2.5 rounded-field border border-dashed border-strong px-3 py-2.5">
          <span className="w-4 font-display text-xs font-bold text-faint">4</span>
          <StatusDot status="offline" />
          <span className="flex-1 text-[13px] text-faint">Slot kosong — bagikan kode room</span>
        </li>
      </ul>
    </Card>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-dvh bg-surface">
      <Aura />
      <AppHeader subtitle="Real-time chat & arena skor" />

      <main className="mx-auto w-full max-w-[1400px] px-4">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
          <div>
            <span className="label-caps inline-flex items-center gap-2 rounded-full border border-hairline bg-inset px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-accent" />
              Maksimal 4 pemain per room
            </span>

            <h1 className="mt-6 text-[2.5rem] leading-[1.05] sm:text-[3.25rem] lg:text-[3.75rem]">
              Ngobrol bareng,
              <br />
              lalu rebut poinnya.
            </h1>

            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted">
              Satu tempat untuk ngobrol real-time sekaligus bermain di arena skor. Buat
              room, ajak teman masuk, kumpulkan token, dan pemain dengan skor tertinggi
              keluar sebagai pemenang.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/login" className={buttonStyles({ variant: "primary", size: "lg" })}>
                Mulai chat
              </Link>
              <Link href="/game" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                <GamepadIcon width={18} height={18} />
                Buka arena
              </Link>
            </div>

            <p className="mt-5 text-xs text-faint">
              Belum punya akun?{" "}
              <Link href="/register" className="font-medium text-accent-text hover:underline">
                Daftar gratis
              </Link>
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <RoomPreview />
            <ScoreRack />
          </div>
        </section>

        <section className="grid gap-4 border-t border-hairline py-16 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex flex-col gap-3 pr-6">
                <span className="flex size-10 items-center justify-center rounded-field bg-accent-soft text-accent-text">
                  <Icon width={20} height={20} />
                </span>
                <h2 className="text-base font-semibold">{feature.title}</h2>
                <p className="text-sm leading-relaxed text-muted">{feature.body}</p>
              </div>
            );
          })}
        </section>

        <section className="flex flex-col items-start gap-6 rounded-card border border-hairline bg-sidebar p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Siap masuk arena?</h2>
            <p className="mt-2 max-w-lg text-sm text-muted">
              Buat room, bagikan kode empat huruf, dan tunggu tiga teman lain bergabung.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className={buttonStyles({ variant: "primary", size: "lg" })}>
              Buat akun
            </Link>
            <Link href="/login" className={buttonStyles({ variant: "secondary", size: "lg" })}>
              <LockIcon width={18} height={18} />
              Masuk
            </Link>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-hairline py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <Wordmark />
          </div>
          <div className="flex items-center gap-5 text-xs text-faint">
            <span className="inline-flex items-center gap-1.5">
              <TrophyIcon width={14} height={14} />
              Arena Skor
            </span>
            <Link href="/chat" className="hover:text-heading">
              Chat
            </Link>
            <Link href="/game" className="hover:text-heading">
              Game
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
