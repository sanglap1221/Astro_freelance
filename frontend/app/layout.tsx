import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "Astro Workspace — জীবন জিজ্ঞাসা",
  description: "Professional Astrological Report System — WYSIWYG Editor",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&family=Tiro+Bangla:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="min-h-screen" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif", background: "#f7f5f0" }}>
        {children}
      </body>
    </html>
  );
}