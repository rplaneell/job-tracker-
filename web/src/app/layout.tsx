import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Job tracker" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">New roles</Link>
          <Link href="/pipeline">Pipeline</Link>
          <Link href="/health">Sources health</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
