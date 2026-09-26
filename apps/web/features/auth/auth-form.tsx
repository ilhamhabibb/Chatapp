"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, jsonBody } from "../../lib/api";
import { Aura } from "../../components/ui/aura";
import { AppHeader, BrandMark } from "../../components/ui/shell";
import { Button, buttonStyles } from "../../components/ui/button";
import { Card, Field, TextInput } from "../../components/ui/primitives";
import { Notice } from "../../components/ui/notice";

type AuthFormProps = { mode: "login" | "register" };

type RegisterResult = {
  user: { id: string; email: string; username: string; displayName: string; emailVerified: boolean };
  devVerificationToken?: string;
};

const copy = {
  login: {
    title: "Masuk ke Chating Arena",
    lead: "Lanjutkan obrolan dan room game kamu yang terakhir.",
    submit: "Masuk",
    busy: "Memproses",
    switchText: "Belum punya akun?",
    switchHref: "/register",
    switchLabel: "Daftar",
  },
  register: {
    title: "Buat akun baru",
    lead: "Satu akun untuk chat real-time dan Arena Skor sekaligus.",
    submit: "Buat akun",
    busy: "Memproses",
    switchText: "Sudah punya akun?",
    switchHref: "/login",
    switchLabel: "Masuk",
  },
} as const;

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const text = copy[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setDevToken(null);
    try {
      if (mode === "login") {
        await apiFetch<{ user: unknown }>("/api/auth/login", jsonBody({ email, password }));
        router.push("/chat");
        return;
      }
      const result = await apiFetch<RegisterResult>(
        "/api/auth/register",
        jsonBody({ email, username, displayName, password }),
      );
      setMessage("Akun berhasil dibuat. Verifikasi email kamu sebelum login.");
      setDevToken(result.devVerificationToken ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh bg-surface">
      <Aura />
      <AppHeader />

      <main className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-14">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size={44} />
          <div>
            <h1 className="text-2xl font-bold">{text.title}</h1>
            <p className="mt-2 text-sm text-muted">{text.lead}</p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Email">
              {(id) => (
                <TextInput
                  id={id}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              )}
            </Field>

            {mode === "register" ? (
              <>
                <Field label="Username">
                  {(id) => (
                    <TextInput
                      id={id}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      required
                    />
                  )}
                </Field>
                <Field label="Nama tampilan" hint="Ini nama yang muncul di chat dan papan skor.">
                  {(id) => (
                    <TextInput
                      id={id}
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      required
                    />
                  )}
                </Field>
              </>
            ) : null}

            <Field label="Password" hint={mode === "register" ? "Minimal 8 karakter." : undefined}>
              {(id) => (
                <TextInput
                  id={id}
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              )}
            </Field>

            <Button type="submit" variant="primary" size="lg" disabled={loading} className="mt-1">
              {loading ? text.busy : text.submit}
            </Button>

            {message ? <Notice tone={devToken ? "warning" : "success"}>{message}</Notice> : null}

            {devToken ? (
              <div className="flex flex-col gap-2 rounded-field border border-hairline bg-inset p-3.5">
                <span className="label-caps">Langkah berikutnya</span>
                <Link
                  href={`/verify-email?token=${encodeURIComponent(devToken)}`}
                  className={buttonStyles({ variant: "primary", size: "md" })}
                >
                  Verifikasi email sekarang
                </Link>
                <p className="text-xs leading-relaxed text-muted">
                  Login hanya bisa dipakai setelah email terverifikasi. Mode development tidak
                  mengirim email, jadi pakai tombol di atas.
                </p>
              </div>
            ) : null}

            {error ? <Notice tone="danger">{error}</Notice> : null}
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          {text.switchText}{" "}
          <Link href={text.switchHref} className="font-medium text-accent-text hover:underline">
            {text.switchLabel}
          </Link>
        </p>
      </main>
    </div>
  );
}
