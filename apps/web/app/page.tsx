import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Chating Arena</h1>
      <p>Chat real-time dan game Arena Skor untuk maksimal empat pemain.</p>
      <nav>
        <Link href="/login">Login</Link>
        <Link href="/register">Daftar</Link>
        <Link href="/chat">Chat</Link>
        <Link href="/game">Game</Link>
      </nav>
    </main>
  );
}
