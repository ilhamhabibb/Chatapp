"use client";

import { useEffect, useState } from "react";
import { apiFetch, jsonBody } from "../../lib/api";

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function verify() {
    if (!token) {
      setError("Token tidak ditemukan");
      return;
    }
    try {
      await apiFetch("/api/auth/verify-email", jsonBody({ token }));
      setMessage("Email berhasil diverifikasi");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verifikasi gagal");
    }
  }

  return (
    <main>
      <h1>Verifikasi email</h1>
      <button type="button" onClick={verify}>Verifikasi sekarang</button>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
