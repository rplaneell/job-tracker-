import "./globals.css";

export const metadata = { title: "Job Tracker" };

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap";

// Applies the saved light or dark choice before the first paint, so the page never flashes.
const themeScript = `try{var t=localStorage.getItem("jt-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS_URL} />
        {/* nosemgrep: pg_html_injection_sink -- reviewed: themeScript is a fixed string in this file, no user input reaches it */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
