import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chating Arena",
  description: "Chat real-time dan Arena Skor",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
