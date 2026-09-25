import Link from "next/link";
import { AuthForm } from "../../features/auth/auth-form";

export default function RegisterPage() {
  return (
    <main>
      <AuthForm mode="register" />
      <Link href="/login">Sudah punya akun</Link>
    </main>
  );
}
