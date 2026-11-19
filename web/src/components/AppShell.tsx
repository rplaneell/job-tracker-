"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/client";

type Counts = { roles: number; pipeline: number; sources: number };

const icons = {
  office: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17V8l7-5 7 5v9" />
      <path d="M8 17v-5h4v5" />
    </svg>
  ),
  roles: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="3" />
      <path d="M6.5 8h7M6.5 12h4" />
    </svg>
  ),
  pipeline: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="4" height="14" rx="1.5" />
      <rect x="8.5" y="3" width="4" height="9" rx="1.5" />
      <rect x="14" y="3" width="3" height="6" rx="1.5" />
    </svg>
  ),
  sources: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 3v2.5M10 14.5V17M3 10h2.5M14.5 10H17" />
    </svg>
  ),
  cv: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 2.5h7l3 3v12H5z" />
      <path d="M8 9h5M8 12h5M8 15h3" />
    </svg>
  ),
  practice: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3 3 7l7 4 7-4-7-4Z" />
      <path d="M5.5 9v4c0 1.2 2 2.5 4.5 2.5s4.5-1.3 4.5-2.5V9" />
    </svg>
  ),
};

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const set = document.documentElement.getAttribute("data-theme");
    setDark(set ? set === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("jt-theme", next);
    } catch {
      // storage can be blocked; the choice still applies for this visit
    }
    setDark(!dark);
  };
  return { dark, toggle };
}

export default function AppShell({ counts, children }: { counts: Counts; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const current = (href: string) => path.startsWith(href);

  async function signOut() {
    await browserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const item = (href: string, label: string, icon: React.ReactNode, extra: React.ReactNode) => (
    <Link href={href} aria-current={current(href) ? "page" : undefined}>
      {icon}
      {label}
      {extra}
    </Link>
  );

  return (
    <div className="shell">
      <aside className="side">
        {/* the office is a separate page of its own, so this is a plain link and not a client side one */}
        <a href="/hq" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/brand/the-climb-mark.png" alt="" width={28} height={28} />
          the climb
        </a>
        <nav className="nav" aria-label="Main">
          <a href="/hq">
            {icons.office}
            Office
          </a>
          {item("/roles", "Roles", icons.roles, <span className="count">{counts.roles}</span>)}
          {item("/pipeline", "Pipeline", icons.pipeline, counts.pipeline ? <span className="count">{counts.pipeline}</span> : null)}
          {item("/sources", "Sources", icons.sources, <span className="count">{counts.sources}</span>)}
          {item("/cv", "Your CV", icons.cv, null)}
          {item("/practice", "Practice", icons.practice, <span className="soon">soon</span>)}
        </nav>
        <div className="side-foot">
          <button className="ghost" type="button" onClick={toggle} aria-label="Switch between light and dark">
            <span aria-hidden="true">{dark ? "☾" : "☀"}</span>
            {dark ? "Dark" : "Light"}
          </button>
          <button className="ghost" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="wrap">{children}</div>
      </main>
    </div>
  );
}
