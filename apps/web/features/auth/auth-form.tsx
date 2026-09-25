"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, jsonBody } from "../../lib/api";

type AuthFormProps = { mode: "login" | "register" };

type RegisterResult = {
  user: { id: string; email: string; username: string; displayName: string; emailVerified: boolean };
  devVerificationToken?: string;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (mode === "login") {
        await apiFetch<{ user: unknown }>("/api/auth/login", jsonBody({ email, password }));
        router.push("/chat");
        return;
      }
      const result = await apiFetch<RegisterResult>("/api/auth/register", jsonBody({ email, username, displayName, password }));
      setMessage(`Akun dibuat. Verifikasi token dev: ${result.devVerificationToken ?? "cek email"}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h1>{mode === "login" ? "Login" : "Daftar akun"}</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      {mode === "register" ? (
        <>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label>
            Nama tampilan
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </label>
        </>
      ) : null}
      <label>
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
      </label>
      <button type="submit" disabled={loading}>{loading ? "Memproses" : mode === "login" ? "Masuk" : "Buat akun"}</button>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
