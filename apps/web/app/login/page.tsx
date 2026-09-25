import Link from "next/link";
import { AuthForm } from "../../features/auth/auth-form";

export default function LoginPage() {
  return (
    <main>
      <AuthForm mode="login" />
      <Link href="/register">Belum punya akun</Link>
    </main>
  );
}
