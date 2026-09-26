"use client";

import { FormEvent, useEffect, useState } from "react";
import { Aura } from "../../components/ui/aura";
import { AppHeader, BrandMark } from "../../components/ui/shell";
import { Button } from "../../components/ui/button";
import { Card, Field, TextInput } from "../../components/ui/primitives";
import { Notice } from "../../components/ui/notice";
import { apiFetch, jsonBody } from "../../lib/api";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Token tidak ditemukan");
      return;
    }
    setError("");
    try {
      await apiFetch("/api/auth/reset-password", jsonBody({ token, password }));
      setMessage("Password berhasil diubah");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reset password gagal");
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
            <h1 className="text-2xl font-bold">Reset password</h1>
            <p className="mt-2 text-sm text-muted">
              Masukkan password baru untuk akun kamu. Minimal 8 karakter.
            </p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Password baru" hint="Minimal 8 karakter.">
              {(id) => (
                <TextInput
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              )}
            </Field>

            <Button type="submit" variant="primary" size="lg">
              Ubah password
            </Button>

            {message ? <Notice tone="success">{message}</Notice> : null}
            {error ? <Notice tone="danger">{error}</Notice> : null}
          </form>
        </Card>
      </main>
    </div>
  );
}
