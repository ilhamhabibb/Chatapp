"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Aura } from "../../components/ui/aura";
import { AppHeader, BrandMark } from "../../components/ui/shell";
import { Button, buttonStyles } from "../../components/ui/button";
import { Card } from "../../components/ui/primitives";
import { Notice } from "../../components/ui/notice";
import { CheckCircleIcon } from "../../components/ui/icons";
import { apiFetch, jsonBody } from "../../lib/api";

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
    setPending(false);
  }, []);

  async function verify() {
    if (!token) {
      setError("Token tidak ditemukan");
      return;
    }
    setError("");
    setMessage("");
    try {
      await apiFetch("/api/auth/verify-email", jsonBody({ token }));
      setMessage("Email berhasil diverifikasi");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verifikasi gagal");
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
            <h1 className="text-2xl font-bold">Verifikasi email</h1>
            <p className="mt-2 text-sm text-muted">
              Konfirmasi alamat email kamu untuk mengaktifkan akun dan masuk ke arena.
            </p>
          </div>
        </div>

        <Card className="flex flex-col gap-4 p-6">
          {pending ? null : token ? (
            <>
              <p className="text-sm text-muted">
                Token ditemukan. Klik tombol di bawah untuk mengonfirmasi email kamu.
              </p>
              <Button variant="primary" size="lg" onClick={() => void verify()}>
                <CheckCircleIcon width={18} height={18} />
                Verifikasi sekarang
              </Button>
            </>
          ) : (
            <Notice tone="warning">
              Token verifikasi tidak ditemukan di alamat ini. Buka tautan dari email yang kamu
              terima, atau kembali ke halaman pendaftaran untuk meminta token baru.
            </Notice>
          )}

          {message ? (
            <div className="flex flex-col gap-3">
              <Notice tone="success">{message}</Notice>
              <Link href="/login" className={buttonStyles({ variant: "primary", size: "md" })}>
                Lanjut ke login
              </Link>
            </div>
          ) : null}
          {error ? <Notice tone="danger">{error}</Notice> : null}
        </Card>
      </main>
    </div>
  );
}
