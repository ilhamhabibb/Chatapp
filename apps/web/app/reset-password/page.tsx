"use client";

import { FormEvent, useEffect, useState } from "react";
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
    try {
      await apiFetch("/api/auth/reset-password", jsonBody({ token, password }));
      setMessage("Password berhasil diubah");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reset password gagal");
    }
  }

  return (
    <main>
      <h1>Reset password</h1>
      <form onSubmit={submit}>
        <label>
          Password baru
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
        </label>
        <button type="submit">Ubah password</button>
      </form>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
